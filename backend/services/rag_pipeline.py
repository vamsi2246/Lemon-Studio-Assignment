import os
import logging
import time
from typing import Dict, Any, List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from backend.services.vector_store import similarity_search_in_store

logger = logging.getLogger(__name__)

# List of models to try in order of preference to avoid 404 NOT_FOUND errors.
# Google recently migrated active models, retiring legacy gemini-1.5 series in v1beta.
# Available models: gemini-3.5-flash, gemini-2.5-flash, gemini-2.0-flash, gemini-flash-latest
GEMINI_MODELS = [
    "models/gemini-3.5-flash",
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash",
    "models/gemini-flash-latest"
]

def generate_rag_response(
    question: str, 
    k: int = 4, 
    selected_files: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    RAG pipeline:
    1. Retrieval: Search FAISS for chunks similar to the question, optionally filtering by selected_files list.
    2. Grounding: Construct a context-specific system prompt with strict factual instructions.
    3. Generation: Invoke a stable Gemini model (with fallbacks) to produce a grounded response.
    """
    start_time = time.time()
    
    # 1. Retrieval
    retrieved_chunks = similarity_search_in_store(question, k=k, selected_files=selected_files)
    
    if not retrieved_chunks:
        return {
            "answer": "No reference context was found. Please ensure you have uploaded documents and selected them as active knowledge sources.",
            "sources": [],
            "latency_ms": round((time.time() - start_time) * 1000, 2)
        }
    
    # Construct context from chunks
    context_list = []
    for idx, chunk in enumerate(retrieved_chunks):
        context_list.append(
            f"--- CHUNK {idx+1} (Source: {chunk['document_name']}, Page: {chunk['page']}) ---\n"
            f"{chunk['text']}"
        )
    context_str = "\n\n".join(context_list)
    
    # 2. System prompt for hallucination reduction
    system_instruction = (
        "You are an expert Enterprise AI Search Assistant. Your goal is to provide highly precise, "
        "professional, and grounded answers using ONLY the provided text context extracted from PDFs.\n\n"
        "Follow these rules strictly:\n"
        "1. Answer the user's question using ONLY the provided Context block. Avoid bringing in external facts.\n"
        "2. If the answer cannot be found in the provided Context, state exactly: "
        "'I cannot find the answer in the uploaded documents.' and do not attempt to fabricate an answer.\n"
        "3. Provide rich, professional responses formatted in clean, valid Markdown (use lists, bold text, "
        "sub-headers, or tables when appropriate).\n"
        "4. Do not mention 'Context chunk X' directly in the flow of the text, but maintain absolute truthfulness "
        "to the context provided."
    )
    
    user_prompt = f"Context:\n{context_str}\n\nQuestion:\n{question}"
    
    # 3. Model generation with fallbacks
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
        
    last_error = None
    for model_name in GEMINI_MODELS:
        try:
            logger.info(f"Attempting to generate RAG response with model: {model_name}")
            model = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                temperature=0.2
            )
            
            messages = [
                SystemMessage(content=system_instruction),
                HumanMessage(content=user_prompt)
            ]
            
            response = model.invoke(messages)
            
            # Robust content parsing for list of blocks (common in some langchain-google-genai versions)
            content = response.content
            if isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, dict) and "text" in part:
                        parts.append(part["text"])
                    elif isinstance(part, str):
                        parts.append(part)
                    elif hasattr(part, "text"):
                        parts.append(part.text)
                answer = "".join(parts)
            else:
                answer = str(content)
            
            latency_ms = (time.time() - start_time) * 1000
            
            return {
                "answer": answer,
                "sources": retrieved_chunks,
                "latency_ms": round(latency_ms, 2)
            }
        except Exception as e:
            logger.warning(f"Failed to generate RAG response with {model_name}: {e}")
            last_error = e
            continue
            
    # If all models fail, return a elegant error explanation
    logger.error(f"All RAG model attempts failed. Last error: {last_error}")
    latency_ms = (time.time() - start_time) * 1000
    return {
        "answer": f"We encountered an issue communicating with the AI model. Please verify your API key and try again later. (Error: {str(last_error)})",
        "sources": retrieved_chunks,
        "latency_ms": round(latency_ms, 2)
    }
