import os
import logging
import time
from typing import List
from langchain_core.embeddings import Embeddings
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Resilient fallback list of Google Gemini embedding models.
# All these models return 3072-dimensional dense vectors, ensuring FAISS index dimension compatibility.
EMBEDDING_MODELS = [
    "models/gemini-embedding-001",
    "models/gemini-embedding-2",
    "models/gemini-embedding-2-preview"
]

class ResilientGeminiEmbeddings(Embeddings):
    """
    Production-grade resilient embeddings connector for Google Gemini.
    Bypasses standard LangChain wrapper issues by calling the official google-generativeai SDK directly.
    Provides robust handling for rate limits (429), API server downtime (503), model availability,
    and automatically normalizes text to prevent INVALID_ARGUMENT exceptions.
    """
    def __init__(self, api_key: str, default_model: str = "models/gemini-embedding-001"):
        # Strip whitespaces and surrounding single/double quotes to resolve cloud setup issues
        self.api_key = api_key.strip().strip('"').strip("'")
        self.default_model = default_model
        
        # Centralized SDK configuration explicitly using standard REST transport
        # to bypass gRPC blocks or missing system gRPC libraries in containerized hosts
        genai.configure(api_key=self.api_key, transport="rest")
        logger.info(f"ResilientGeminiEmbeddings initialized with primary model: {self.default_model} using transport: rest")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embeds a list of document chunks with automatic validation, exponential retries, and model fallbacks.
        """
        # 1. Clean and validate inputs to prevent API errors
        cleaned_texts = []
        for text in texts:
            cleaned = text.strip() if text else ""
            if not cleaned:
                cleaned = "[empty chunk]"  # Safe fallback for empty inputs
            cleaned_texts.append(cleaned)

        logger.info(f"Generating embeddings for {len(cleaned_texts)} chunks...")
        
        last_error = None
        # Try models in order of preference to safeguard against regional outages or deprecations
        for model in EMBEDDING_MODELS:
            max_retries = 4
            for attempt in range(max_retries):
                try:
                    logger.info(f"Embedding batch (size={len(cleaned_texts)}) with {model} (Attempt {attempt + 1}/{max_retries})...")
                    
                    response = genai.embed_content(
                        model=model,
                        content=cleaned_texts,
                        task_type="retrieval_document"
                    )
                    
                    if "embedding" in response:
                        embeddings = response["embedding"]
                        logger.info(f"Successfully generated {len(embeddings)} embeddings using {model}.")
                        return embeddings
                    else:
                        raise ValueError(f"API response missing 'embedding' key: {response}")
                        
                except Exception as e:
                    last_error = e
                    err_msg = str(e)
                    logger.warning(
                        f"Embedding attempt {attempt + 1}/{max_retries} failed using {model}. Error: {err_msg}"
                    )
                    
                    # Check for rate limits (429) or temporary server errors (503)
                    if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "503" in err_msg:
                        sleep_time = (attempt + 1) * 3
                        logger.info(f"Rate limit or server error. Sleeping {sleep_time}s before retry...")
                        time.sleep(sleep_time)
                    # If it's a model-not-found or API version error, fallback immediately to next model
                    elif "404" in err_msg or "NOT_FOUND" in err_msg:
                        logger.warning(f"Model {model} returned 404 NOT_FOUND. Advancing to next fallback model.")
                        break
                    # For other errors, wait a moment and retry
                    else:
                        time.sleep(1.5)
            else:
                logger.warning(f"All retries failed for model {model}. Attempting fallback model...")
                continue
                
        # If everything fails, raise a detailed, helpful error
        logger.error(f"CRITICAL: All Gemini embedding models failed. Last error: {last_error}")
        
        err_msg_str = str(last_error)
        if "api key not valid" in err_msg_str.lower() or "api_key_invalid" in err_msg_str.upper() or "not valid" in err_msg_str.lower():
            raise RuntimeError(
                "API key not valid. The key configured in your Render environment variables was rejected by Google AI Studio. "
                "Please verify that you have pasted your active, valid Google AI Studio API key in the Render Dashboard "
                "and removed any typos or placeholder values (like 'AIzaSyYourActualKeyHere')."
            )
            
        raise RuntimeError(
            f"Gemini Embedding Service failed: {last_error}. "
            "Verify your GEMINI_API_KEY is active and has appropriate quota limits."
        )

    def embed_query(self, text: str) -> List[float]:
        """
        Embeds a single user search query.
        """
        cleaned_text = text.strip() if text else "empty search query"
        
        last_error = None
        for model in EMBEDDING_MODELS:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = genai.embed_content(
                        model=model,
                        content=cleaned_text,
                        task_type="retrieval_query"
                    )
                    
                    if "embedding" in response:
                        return response["embedding"]
                    else:
                        raise ValueError(f"API response missing 'embedding' key")
                        
                except Exception as e:
                    last_error = e
                    err_msg = str(e)
                    logger.warning(f"Query embedding attempt {attempt + 1}/{max_retries} failed with {model}. Error: {err_msg}")
                    
                    if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "503" in err_msg:
                        time.sleep((attempt + 1) * 2)
                    elif "404" in err_msg or "NOT_FOUND" in err_msg:
                        break
                    else:
                        time.sleep(1)
            else:
                continue
                
        logger.error(f"CRITICAL: All query embedding models failed. Last error: {last_error}")
        raise RuntimeError(f"Gemini Query Embedding Service failed: {last_error}")

def get_embeddings_model():
    """
    Instantiates and returns the robust ResilientGeminiEmbeddings model.
    Fully compatible with LangChain's vector stores (e.g. FAISS).
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not defined")
        
    return ResilientGeminiEmbeddings(api_key=api_key)
