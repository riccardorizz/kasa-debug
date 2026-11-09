import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator

from fastapi import FastAPI, Path, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from kasa import Credentials, Discover, KasaException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HOST = os.getenv("BULB_IP", "192.168.0.5")
TAPO_USER = os.getenv("TAPO_USER", "")
TAPO_PASS = os.getenv("TAPO_PASS", "")
CREDS = Credentials(TAPO_USER, TAPO_PASS) if TAPO_USER and TAPO_PASS else None


async def get_or_connect_bulb(app: FastAPI):
    bulb = getattr(app.state, "bulb", None)
    if bulb is not None:
        return bulb
    if not TAPO_USER or not TAPO_PASS:
        logger.warning("TAPO_USER o TAPO_PASS non configurati nel file .env.")
        return None
    try:
        bulb = await asyncio.wait_for(
            Discover.discover_single(HOST, credentials=CREDS), timeout=4.0
        )
        app.state.bulb = bulb
        logger.info("Connesso con successo alla lampadina Tapo su %s", HOST)
        return bulb
    except Exception as exc:
        logger.warning("Impossibile connettersi alla lampadina su %s: %s", HOST, exc)
        return None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.bulb = None
    if not TAPO_USER or not TAPO_PASS:
        logger.warning("TAPO_USER e TAPO_PASS devono essere configurati in .env.")
    else:
        # Tenta la connessione all'avvio senza far crashare il server se la lampadina è offline
        await get_or_connect_bulb(app)
    yield


app = FastAPI(lifespan=lifespan)

# Abilita CORS per consentire l'accesso da qualsiasi client (LAN, PWA, localhost, ecc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ColorRequest(BaseModel):
    hue: int = Field(ge=0, le=360)
    saturation: int = Field(ge=0, le=100)
    value: int = Field(ge=0, le=100)


@app.exception_handler(KasaException)
async def kasa_exception_handler(
    request: Request, exc: KasaException
) -> JSONResponse:
    logger.warning("Errore di comunicazione con la lampadina: %s", exc)
    request.app.state.bulb = None  # Reset per tentare la riconnessione alla prossima chiamata
    return JSONResponse(
        status_code=503,
        content={"status": 503, "detail": "Lampadina non raggiungibile o errore di comunicazione."},
    )


@app.get("/api/state")
async def get_state(request: Request) -> dict:
    bulb = await get_or_connect_bulb(request.app)
    if bulb is None:
        return JSONResponse(
            status_code=503,
            content={"status": 503, "detail": "Lampadina non configurata o non raggiungibile."},
        )
    try:
        await bulb.update()
        light = bulb.modules["Light"]
        hsv = light.hsv
        return {
            "status": 200,
            "is_on": bulb.is_on,
            "brightness": light.brightness,
            "color_temp": light.color_temp,
            "hsv": {
                "hue": hsv.hue,
                "saturation": hsv.saturation,
                "value": hsv.value,
            },
        }
    except Exception as exc:
        request.app.state.bulb = None
        return JSONResponse(
            status_code=503,
            content={"status": 503, "detail": f"Errore lettura stato lampadina: {exc}"},
        )


@app.get("/api/info")
async def get_info(request: Request) -> dict:
    bulb = await get_or_connect_bulb(request.app)
    if bulb is None:
        return {
            "status": 200,
            "connected": False,
            "model": "Tapo L535",
            "alias": "Lampadina Smart",
            "host": HOST,
            "mac": "B0-19-21-8A-6B-D0",
            "hw_version": "1.0",
            "sw_version": "1.1.5 Build 240328 Rel.194528",
            "rssi": -52
        }
    try:
        await bulb.update()
        return {
            "status": 200,
            "connected": True,
            "model": getattr(bulb, "model", "Tapo L535"),
            "alias": getattr(bulb, "alias", "Lampadina Smart"),
            "host": getattr(bulb, "host", HOST),
            "mac": getattr(bulb, "mac", "B0-19-21-8A-6B-D0"),
            "hw_version": getattr(bulb, "hw_version", "1.0"),
            "sw_version": getattr(bulb, "sw_version", "1.1.5 Build 240328 Rel.194528"),
            "rssi": getattr(bulb, "rssi", -52)
        }
    except Exception:
        return {
            "status": 200,
            "connected": False,
            "model": "Tapo L535",
            "alias": "Lampadina Smart",
            "host": HOST,
            "mac": "B0-19-21-8A-6B-D0",
            "hw_version": "1.0",
            "sw_version": "1.1.5 Build 240328 Rel.194528",
            "rssi": -52
        }


@app.post("/api/power/{on}")
async def set_power(on: bool, request: Request) -> dict:
    bulb = await get_or_connect_bulb(request.app)
    if bulb is None:
        return JSONResponse(
            status_code=503,
            content={"status": 503, "detail": "Lampadina non raggiungibile."},
        )
    if on:
        await bulb.turn_on()
    else:
        await bulb.turn_off()
    return {"status": 200, "is_on": on}


@app.post("/api/brightness/{level}")
async def set_brightness(
    request: Request, level: Annotated[int, Path(ge=0, le=100)]
) -> dict:
    bulb = await get_or_connect_bulb(request.app)
    if bulb is None:
        return JSONResponse(
            status_code=503,
            content={"status": 503, "detail": "Lampadina non raggiungibile."},
        )
    await bulb.modules["Light"].set_brightness(level)
    return {"status": 200, "brightness": level}


@app.post("/api/temp/{kelvin}")
async def set_color_temperature(
    request: Request, kelvin: Annotated[int, Path(ge=2500, le=6500)]
) -> dict:
    bulb = await get_or_connect_bulb(request.app)
    if bulb is None:
        return JSONResponse(
            status_code=503,
            content={"status": 503, "detail": "Lampadina non raggiungibile."},
        )
    await bulb.modules["Light"].set_color_temp(kelvin)
    return {"status": 200, "color_temp": kelvin}


@app.post("/api/color")
async def set_color(color: ColorRequest, request: Request) -> dict:
    bulb = await get_or_connect_bulb(request.app)
    if bulb is None:
        return JSONResponse(
            status_code=503,
            content={"status": 503, "detail": "Lampadina non raggiungibile."},
        )
    await bulb.modules["Light"].set_hsv(
        color.hue, color.saturation, color.value
    )
    return {
        "status": 200,
        "hue": color.hue,
        "saturation": color.saturation,
        "value": color.value,
    }


PRESETS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "presets.json")

DEFAULT_PRESETS = [
    {"name": "Preset 1", "type": "white", "temp": 2700, "brightness": 100},
    {"name": "Preset 2", "type": "white", "temp": 3000, "brightness": 100},
    {"name": "Preset 3", "type": "white", "temp": 3300, "brightness": 100},
    {"name": "Preset 4", "type": "white", "temp": 3600, "brightness": 100},
    {"name": "Preset 5", "type": "color", "hue": 280, "saturation": 100, "brightness": 100},
    {"name": "Preset 6", "type": "color", "hue": 55, "saturation": 100, "brightness": 100},
    {"name": "Preset 7", "type": "color", "hue": 300, "saturation": 100, "brightness": 100},
]


def load_presets_from_file() -> list[dict]:
    if os.path.exists(PRESETS_FILE):
        try:
            with open(PRESETS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as exc:
            logger.warning("Errore lettura file presets: %s", exc)
    return list(DEFAULT_PRESETS)


def save_presets_to_file(presets: list[dict]) -> None:
    try:
        tmp_file = PRESETS_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(presets, f, indent=2, ensure_ascii=False)
        os.replace(tmp_file, PRESETS_FILE)
    except Exception as exc:
        logger.warning("Errore salvataggio file presets: %s", exc)


class PresetsPayload(BaseModel):
    presets: list[dict]


@app.get("/api/presets")
async def get_presets() -> dict:
    presets = load_presets_from_file()
    return {"status": 200, "presets": presets}


@app.post("/api/presets")
async def update_presets(payload: PresetsPayload) -> dict:
    save_presets_to_file(payload.presets)
    return {"status": 200, "presets": payload.presets}


app.mount("/", StaticFiles(directory="static", html=True), name="static")

