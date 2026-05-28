import os
import logging
from langchain_google_genai import GoogleGenerativeAIEmbeddings

logger = logging.getLogger(__name__)

# Google has migrated all embedding models to the gemini-embedding-* namespace.
# Legacy model names like "embedding-001" and "text-embedding-004" were retired
# from the v1beta API in early 2026.
#
# Currently available embedding models (as of May 2026):
#   - models/gemini-embedding-001  (3072-dim, production-stable)
#   - models/gemini-embedding-2    (3072-dim, latest generation)
#
EMBEDDING_MODEL = "models/gemini-embedding-001"

def get_embeddings_model():
    """
    Returns the Google Generative AI Embeddings model configured with our API key.
    Uses the production-stable gemini-embedding-001 model (3072 dimensions).
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    logger.info(f"Initializing embedding model: {EMBEDDING_MODEL}")
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=api_key
    )
