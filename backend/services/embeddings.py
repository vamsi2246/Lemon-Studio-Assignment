import os
import logging
from langchain_google_genai import GoogleGenerativeAIEmbeddings

logger = logging.getLogger(__name__)

# The user explicitly requested to use 'models/text-embedding-004' as the ONLY supported embedding model
EMBEDDING_MODEL = "models/text-embedding-004"

def get_embeddings_model():
    """
    Returns the Google Generative AI Embeddings model configured with our API key.
    Uses the production-stable text-embedding-004 model (768 dimensions) as explicitly required by the checklist.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not defined")

    # Strip whitespaces and surrounding single/double quotes to resolve cloud setup issues
    api_key = api_key.strip().strip('"').strip("'")

    logger.info(f"Initializing GoogleGenerativeAIEmbeddings with model: {EMBEDDING_MODEL} using REST transport")
    
    # Instantiate the LangChain Google GenAI embeddings class with robust REST transport
    # to guarantee standard HTTP/REST connectivity and completely bypass gRPC blocks in cloud production hosts.
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=api_key,
        transport="rest"
    )
