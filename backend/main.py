import sys
import os

# Dynamic Python path adjustment to allow running main.py directly or as a package
# under various deployment hosts (Docker, Render native Python, local venv)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
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

# Normalize and clean GEMINI_API_KEY globally to handle double quotes or trailing whitespaces from Cloud dashboard setups
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    cleaned_key = gemini_key.strip().strip('"').strip("'")
    if cleaned_key != gemini_key:
        logger.info("Normalizing GEMINI_API_KEY (removing surrounding quotes or whitespace bounds)...")
        os.environ["GEMINI_API_KEY"] = cleaned_key
        gemini_key = cleaned_key

# Verify API key validity and format at startup
if not gemini_key:
    logger.error("❌ CRITICAL: GEMINI_API_KEY environment variable is not defined. GenAI / RAG pipeline will fail.")
elif len(gemini_key) < 10 or not gemini_key.startswith("AIzaSy"):
    logger.error(f"❌ CRITICAL: GEMINI_API_KEY has invalid format (starts with: '{gemini_key[:8]}...'). Expected Google AI Studio format 'AIzaSy...'.")
else:
    logger.info(f"✅ GEMINI_API_KEY loaded and validated successfully (format correct, length: {len(gemini_key)}).")

app = FastAPI(
    title="Lemon Studio Enterprise RAG Engine",
    description="FastAPI + FAISS + Gemini Production-Grade Retrieval Augmented Generation Engine",
    version="1.1.0"
)

# CORS setup for production (Vercel frontend and local development)
# To allow credentials with dynamic origins (e.g. Vercel previews), we use allow_origin_regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173"
    ],
    allow_origin_regex="https://.*\\.vercel\\.app",  # Matches dynamic vercel preview and production subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized global exception handler for production stability
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please verify your RAG index or API key."}
    )

# Import routes
from backend.routes.upload import router as upload_router
from backend.routes.query import router as query_router

# Register routers
app.include_router(upload_router)
app.include_router(query_router)

# Validate embedding model connectivity at startup
# This catches API key issues and deprecated model errors immediately
from backend.services.embeddings import validate_embeddings_on_startup
try:
    validate_embeddings_on_startup()
except Exception as e:
    logger.error(f"Embedding startup validation error: {e}")

@app.get("/")
@app.head("/")
async def root_welcome():
    """Welcome and health endpoint for load balancer port checks."""
    return {
        "message": "Lemon Studio Enterprise RAG API is online.",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
async def health_check():
    """Simple API status health check for deployment orchestrators."""
    return {
        "status": "healthy",
        "api_key_loaded": gemini_key is not None,
        "engine": "FastAPI + FAISS RAG v1.1"
    }

if __name__ == "__main__":
    # In production, Render passes the PORT env variable dynamically
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting production server on {host}:{port}...")
    uvicorn.run("backend.main:app", host=host, port=port, reload=False)
