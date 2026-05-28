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

# Verify API key is present at startup
gemini_key = os.getenv("GEMINI_API_KEY")
if not gemini_key:
    logger.warning("CRITICAL: GEMINI_API_KEY environment variable is not defined. AI services will fail.")
else:
    logger.info("GEMINI_API_KEY loaded successfully.")

app = FastAPI(
    title="Lemon Studio Enterprise RAG Engine",
    description="FastAPI + FAISS + Gemini Production-Grade Retrieval Augmented Generation Engine",
    version="1.1.0"
)

# CORS setup for production (Vercel frontend and local development)
origins = [
    "http://localhost:5173",
    "http://127.0.5173",
    "http://localhost:3000",
    "https://*.vercel.app",  # Support wildcards for dynamic Vercel previews
    "*"  # Wildcard fallback for flexible environments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    host = os.getenv("HOST", "127.0.0.1")
    logger.info(f"Starting production server on {host}:{port}...")
    uvicorn.run("backend.main:app", host=host, port=port, reload=False)
