# =========================================================================
# Production Dockerfile for FastAPI + FAISS RAG Backend
# =========================================================================

# Stage 1: Build virtual environment and install packages
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies into virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Final minimal production image
FROM python:3.11-slim

WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy backend source files
COPY . .

# Create persistent storage directories for FAISS indices and temp files
RUN mkdir -p data/faiss_index data/temp_uploads && chmod -R 777 data

EXPOSE 8000

ENV HOST=0.0.0.0
ENV PORT=8000

CMD ["python", "-m", "backend.main"]
