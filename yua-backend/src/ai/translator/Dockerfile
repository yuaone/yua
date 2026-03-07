FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY translator_service.py .

# Argos models
RUN argospm update && \
    argospm install translate-en_ko && \
    argospm install translate-ko_en

EXPOSE 8088

CMD ["uvicorn", "translator_service:app", "--host", "0.0.0.0", "--port", "8088"]