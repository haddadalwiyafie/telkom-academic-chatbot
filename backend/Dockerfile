FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p uploads chroma_data data

EXPOSE 8000
CMD ["sh", "-c", "echo '=== ENV CHECK ===' && env | grep -E '^(COHERE|DATABASE|SECRET|CORS|PORT|ADMIN|CHROMA)' | cut -d= -f1 | sort && echo '=== STARTING ===' && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
