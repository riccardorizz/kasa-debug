import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator

from fastapi import FastAPI, Path, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from kasa import Credentials, Discover, KasaException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HOST = os.getenv("BULB_IP", "192.168.0.5")
TAPO_USER = os.getenv("TAPO_USER", "")
TAPO_PASS = os.getenv("TAPO_PASS", "")
CREDS = Credentials(TAPO_USER, TAPO_PASS)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    if not TAPO_USER or not TAPO_PASS:
        raise RuntimeError("TAPO_USER e TAPO_PASS devono essere configurati.")

    app.state.bulb = await Discover.discover_single(HOST, credentials=CREDS)
    logger.info("Connesso alla lampadina Tapo su %s", HOST)
    yield


app = FastAPI(lifespan=lifespan)


class ColorRequest(BaseModel):
    hue: int = Field(ge=0, le=360)
    saturation: int = Field(ge=0, le=100)
    value: int = Field(ge=0, le=100)


@app.exception_handler(KasaException)
async def kasa_exception_handler(
    request: Request, exc: KasaException
) -> JSONResponse:
    logger.warning("Errore di comunicazione con la lampadina: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Lampadina non raggiungibile o errore di comunicazione."},
    )


@app.get("/api/state")
async def get_state(request: Request) -> dict:
    bulb = request.app.state.bulb
    await bulb.update()
    light = bulb.modules["Light"]
    hsv = light.hsv
    return {
        "is_on": bulb.is_on,
        "brightness": light.brightness,
        "color_temp": light.color_temp,
        "hsv": {
            "hue": hsv.hue,
            "saturation": hsv.saturation,
            "value": hsv.value,
        },
    }


@app.post("/api/power/{on}")
async def set_power(on: bool, request: Request) -> dict:
    bulb = request.app.state.bulb
    if on:
        await bulb.turn_on()
    else:
        await bulb.turn_off()
    return {"is_on": on}


@app.post("/api/brightness/{level}")
async def set_brightness(
    request: Request, level: Annotated[int, Path(ge=0, le=100)]
) -> dict:
    await request.app.state.bulb.modules["Light"].set_brightness(level)
    return {"brightness": level}


@app.post("/api/temp/{kelvin}")
async def set_color_temperature(
    request: Request, kelvin: Annotated[int, Path(ge=2500, le=6500)]
) -> dict:
    await request.app.state.bulb.modules["Light"].set_color_temp(kelvin)
    return {"color_temp": kelvin}


@app.post("/api/color")
async def set_color(color: ColorRequest, request: Request) -> dict:
    await request.app.state.bulb.modules["Light"].set_hsv(
        color.hue, color.saturation, color.value
    )
    return {
        "hue": color.hue,
        "saturation": color.saturation,
        "value": color.value,
    }


app.mount("/", StaticFiles(directory="static", html=True), name="static")
