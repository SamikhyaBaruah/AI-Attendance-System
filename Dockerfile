FROM python:3.9-slim

# Install system dependencies required for dlib, opencv, etc.
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-6 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files (ignoring those in .dockerignore)
COPY . .

# Expose the FastAPI port
EXPOSE 8000

# Run uvicorn server mapping to all interfaces
CMD ["uvicorn", "ml_backend.api:app", "--host", "0.0.0.0", "--port", "8000"]
