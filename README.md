# Tapo L535 Controller

Local web app for controlling a TP-Link Tapo L535 smart bulb, without the official (very heavy) mobile app.

> **About this project**
> This is a personal experiment: I tried to clone the look and feel of the official TP-Link Tapo app as a lightweight web app / PWA. The UI was built with [Craft Anything](https://craftanything.app), and the backend talks to the bulb over the local network using `python-kasa`.
> It is an unofficial, non-commercial project, not affiliated with, endorsed by, or sponsored by TP-Link. *Tapo* and *TP-Link* are trademarks of TP-Link Systems Inc.

## Features

- Power, brightness, color temperature, and HSV color control
- Preset management
- FastAPI backend with `python-kasa`
- Installable as a PWA (Add to Home Screen from Safari)
- Docker deployment

## Setup

```bash
cp .env.example .env
```

Set the bulb IP and Tapo credentials in `.env`, then start the app:

```bash
docker compose up -d --build
```

Open:

```text
http://localhost:8081
```

> Tip: assign a fixed IP (DHCP reservation) to the bulb from your router, so the address in `.env` never changes.

## API examples

```bash
curl http://localhost:8081/api/state
curl -X POST http://localhost:8081/api/power/true
curl -X POST http://localhost:8081/api/brightness/75
curl -X POST http://localhost:8081/api/temp/4000
curl -X POST http://localhost:8081/api/color \
  -H "Content-Type: application/json" \
  -d '{"hue":280,"saturation":100,"value":100}'
```

## Screenshots

![Main app](docs/screenshots/app-main.png)

![Presets](docs/screenshots/app-presets.png)

![Preset editor](docs/screenshots/app-preset-editor.png)

## Project structure

```text
main.py              FastAPI backend
static/              Web app
presets.json         Saved presets
Dockerfile           Container image
docker-compose.yml   Docker configuration
```

## Credits

- [python-kasa](https://github.com/python-kasa/python-kasa) for the local Tapo protocol support
- [Craft Anything](https://craftanything.app) for the UI
- Design inspired by the official Tapo app by TP-Link

## Disclaimer

Provided as is, for personal and educational use. Not affiliated with TP-Link. Use it at your own risk, and keep it on your local network (do not expose it directly to the internet).
