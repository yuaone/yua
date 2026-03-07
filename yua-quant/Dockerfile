FROM python:3.11-slim

WORKDIR /app

# System deps for numpy/scipy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 5100

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5100"]
