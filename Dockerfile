FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./main.py
COPY static ./static

# presets are stored in a mounted volume so they survive rebuilds
RUN useradd --create-home appuser && mkdir /data && chown appuser /data
USER appuser
ENV PRESETS_FILE=/data/presets.json

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
