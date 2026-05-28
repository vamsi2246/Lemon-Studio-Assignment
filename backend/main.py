import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Verify API key is present
gemini_key = os.getenv("GEMINI_API_KEY")
if not gemini_key:
    logger.warning("CRITICAL: GEMINI_API_KEY environment variable is not defined. AI services will fail.")
else:
    logger.info("GEMINI_API_KEY loaded successfully.")

app = FastAPI(
    title="Enterprise AI Search Assistant",
    description="FastAPI + FAISS + Gemini RAG Engine",
    version="1.0.0"
)

# CORS setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"  # Fallback wildcard for flexible environment setups
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from backend.routes.upload import router as upload_router
from backend.routes.query import router as query_router

# Register routers
app.include_router(upload_router)
app.include_router(query_router)

@app.get("/api/health")
async def health_check():
    """Simple API status health check."""
    return {
        "status": "healthy",
        "api_key_loaded": gemini_key is not None,
        "engine": "FastAPI + FAISS RAG"
    }

if __name__ == "__main__":
    # Standard run command
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
