FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY analyzer.py .
COPY server.py .

EXPOSE 8002

CMD ["python", "server.py"]
