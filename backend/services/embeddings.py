import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings

def get_embeddings_model():
    """
    Returns the Google Generative AI Embeddings model configured with our API key.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key
    )
