import os
import logging
import time
import json
from typing import Dict, Any, List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from backend.services.vector_store import similarity_search_in_store, load_documents_metadata

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
    selected_files: Optional[List[str]] = None,
    history: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    RAG pipeline:
    1. Retrieval: Search FAISS for chunks similar to the question, optionally filtering by selected_files list.
    2. Grounding: Construct a context-specific system prompt with strict factual instructions.
    3. Memory: Inject previous chat history into the message thread for contextual follow-up.
    4. Generation: Invoke a stable Gemini model (with fallbacks) to produce a grounded response.
    """
    start_time = time.time()
    
    # 1. Retrieval
    retrieved_chunks = similarity_search_in_store(question, k=k, selected_files=selected_files)
    
    if not retrieved_chunks:
        try:
            registry = load_documents_metadata()
            total_indexed = len(registry)
        except Exception:
            total_indexed = 0
            
        selected_count = len(selected_files) if selected_files else total_indexed
        selected_list_str = ", ".join([f"'{f}'" for f in selected_files]) if selected_files else "All indexed files"
        
        diag_msg = (
            "⚠️ **No retrieval context was found for your query.**\n\n"
            "**Retrieval Diagnostics**:\n"
            f"- **Active Sources**: {selected_count} document(s) selected\n"
            f"- **Selected Filenames**: {selected_list_str}\n"
            f"- **Total Registry Documents**: {total_indexed} indexed\n"
            f"- **FAISS Match Count**: 0 chunks retrieved\n\n"
            "**Recommendations**:\n"
            "1. Please verify that your selected documents contain text content related to your query.\n"
            "2. Ensure the documents are checked in the sidebar list.\n"
            "3. Try selecting all files to expand the semantic search coverage."
        )
        return {
            "answer": diag_msg,
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
    
    messages = [
        SystemMessage(content=system_instruction)
    ]
    
    # 3. Contextual chat memory injection
    if history:
        for msg in history:
            role = msg.role if hasattr(msg, "role") else msg.get("role")
            text = msg.text if hasattr(msg, "text") else msg.get("text")
            if role == "user":
                messages.append(HumanMessage(content=text))
            elif role == "ai":
                messages.append(AIMessage(content=text))
                
    # Add current user prompt with active context
    user_prompt = f"Context:\n{context_str}\n\nQuestion:\n{question}"
    messages.append(HumanMessage(content=user_prompt))
    
    # 4. Model generation with fallbacks
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    api_key = api_key.strip().strip('"').strip("'")
        
    last_error = None
    for model_name in GEMINI_MODELS:
        try:
            logger.info(f"Attempting to generate RAG response with model: {model_name}")
            model = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                transport="rest",
                temperature=0.2
            )
            
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
            
    # If all models fail, return an elegant error explanation
    logger.error(f"All RAG model attempts failed. Last error: {last_error}")
    latency_ms = (time.time() - start_time) * 1000
    return {
        "answer": f"We encountered an issue communicating with the AI model. Please verify your API key and try again later. (Error: {str(last_error)})",
        "sources": retrieved_chunks,
        "latency_ms": round(latency_ms, 2)
    }

async def generate_rag_response_stream(
    question: str, 
    k: int = 4, 
    selected_files: Optional[List[str]] = None,
    history: Optional[List[Any]] = None
):
    """
    RAG Streaming generator yielding Server-Sent Events (SSE):
    1. Retrieval: Query FAISS search index with active document filters.
    2. Immediate sources dispatch: Yield sources list as JSON first.
    3. Async stream generation: Stream Gemini response tokens word-by-word with reliable model fallbacks.
    4. Done metadata dispatch: Yield final performance metrics (latency).
    """
    start_time = time.time()
    
    # 1. Retrieval
    retrieved_chunks = similarity_search_in_store(question, k=k, selected_files=selected_files)
    
    # Stream retrieved chunks immediately as SSE event: sources
    yield f"event: sources\ndata: {json.dumps(retrieved_chunks)}\n\n"
    
    if not retrieved_chunks:
        try:
            registry = load_documents_metadata()
            total_indexed = len(registry)
        except Exception:
            total_indexed = 0
            
        selected_count = len(selected_files) if selected_files else total_indexed
        selected_list_str = ", ".join([f"'{f}'" for f in selected_files]) if selected_files else "All indexed files"
        
        diag_msg = (
            "⚠️ **No retrieval context was found for your query.**\n\n"
            "**Retrieval Diagnostics**:\n"
            f"- **Active Sources**: {selected_count} document(s) selected\n"
            f"- **Selected Filenames**: {selected_list_str}\n"
            f"- **Total Registry Documents**: {total_indexed} indexed\n"
            f"- **FAISS Match Count**: 0 chunks retrieved\n\n"
            "**Recommendations**:\n"
            "1. Please verify that your selected documents contain text content related to your query.\n"
            "2. Ensure the documents are checked in the sidebar list.\n"
            "3. Try selecting all files to expand the semantic search coverage."
        )
        yield f"event: token\ndata: {json.dumps(diag_msg)}\n\n"
        yield f"event: done\ndata: {json.dumps({'latency_ms': round((time.time() - start_time) * 1000, 2)})}\n\n"
        return
        
    # Construct context from chunks
    context_list = []
    for idx, chunk in enumerate(retrieved_chunks):
        context_list.append(
            f"--- CHUNK {idx+1} (Source: {chunk['document_name']}, Page: {chunk['page']}) ---\n"
            f"{chunk['text']}"
        )
    context_str = "\n\n".join(context_list)
    
    # 2. System prompt
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
    
    messages = [
        SystemMessage(content=system_instruction)
    ]
    
    # 3. Contextual chat memory injection
    if history:
        for msg in history:
            role = msg.role if hasattr(msg, "role") else msg.get("role")
            text = msg.text if hasattr(msg, "text") else msg.get("text")
            if role == "user":
                messages.append(HumanMessage(content=text))
            elif role == "ai":
                messages.append(AIMessage(content=text))
                
    # Add current user prompt with active context
    user_prompt = f"Context:\n{context_str}\n\nQuestion:\n{question}"
    messages.append(HumanMessage(content=user_prompt))
    
    # 4. Stream tokens with backoffs
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    api_key = api_key.strip().strip('"').strip("'")
        
    last_error = None
    stream_success = False
    
    for model_name in GEMINI_MODELS:
        try:
            logger.info(f"Attempting to stream RAG response with model: {model_name}")
            model = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                transport="rest",
                temperature=0.2
            )
            
            async for chunk in model.astream(messages):
                content = chunk.content
                if isinstance(content, list):
                    text_parts = [part["text"] if isinstance(part, dict) and "text" in part else str(part) for part in content]
                    token = "".join(text_parts)
                else:
                    token = str(content)
                    
                if token:
                    yield f"event: token\ndata: {json.dumps(token)}\n\n"
                    
            stream_success = True
            break
        except Exception as e:
            logger.warning(f"RAG streaming failed with model {model_name}: {e}")
            last_error = e
            continue
            
    if not stream_success:
        logger.error(f"All RAG streaming attempts failed. Last error: {last_error}")
        error_msg = f"We encountered an issue communicating with the AI model. (Error: {str(last_error)})"
        yield f"event: token\ndata: {json.dumps(error_msg)}\n\n"
        
    latency_ms = (time.time() - start_time) * 1000
    yield f"event: done\ndata: {json.dumps({'latency_ms': round(latency_ms, 2)})}\n\n"
