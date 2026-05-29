import os
import logging
from langchain_google_genai import GoogleGenerativeAIEmbeddings

logger = logging.getLogger(__name__)

# IMPORTANT: text-embedding-004 was RETIRED on January 14, 2026 and returns 404 NOT_FOUND.
# The current stable GA replacement is 'gemini-embedding-001' (3072 dimensions).
# See: https://ai.google.dev/gemini-api/docs/models#gemini-embedding
EMBEDDING_MODEL = "models/gemini-embedding-001"

# Cached singleton to avoid re-creating the client on every call
_cached_embeddings_model = None

def get_embeddings_model():
    """
    Returns the Google Generative AI Embeddings model configured with our API key.
    Uses the production-stable gemini-embedding-001 model (3072 dimensions).
    
    The model is cached as a singleton since the API key and model name
    don't change during the lifetime of the process.
    """
    global _cached_embeddings_model
    
    if _cached_embeddings_model is not None:
        return _cached_embeddings_model
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not defined")

    # Strip whitespaces and surrounding single/double quotes to resolve cloud setup issues
    api_key = api_key.strip().strip('"').strip("'")

    logger.info(f"Initializing GoogleGenerativeAIEmbeddings with model: {EMBEDDING_MODEL} using REST transport")
    
    # Instantiate the LangChain Google GenAI embeddings class with robust REST transport
    # to guarantee standard HTTP/REST connectivity and completely bypass gRPC blocks in cloud production hosts.
    _cached_embeddings_model = GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=api_key,
        transport="rest"
    )
    
    return _cached_embeddings_model


def validate_embeddings_on_startup():
    """
    Call this once at application startup to verify the embedding model + API key work.
    Returns True if successful, False otherwise. Logs the result clearly.
    """
    try:
        model = get_embeddings_model()
        test_result = model.embed_query("startup validation test")
        dims = len(test_result) if test_result else 0
        logger.info(f"✅ Embedding model validation PASSED: {EMBEDDING_MODEL} → {dims} dimensions")
        return True
    except Exception as e:
        logger.error(f"❌ Embedding model validation FAILED: {EMBEDDING_MODEL} → {e}")
        # Reset cache so it can be retried
        global _cached_embeddings_model
        _cached_embeddings_model = None
        return False
