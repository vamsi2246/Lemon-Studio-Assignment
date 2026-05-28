import os
import logging
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from backend.services.vector_store import similarity_search_in_store

logger = logging.getLogger(__name__)

def generate_rag_response(question: str, k: int = 4) -> Dict[str, Any]:
    """
    RAG pipeline:
    1. Retrieval: Search FAISS for chunks similar to the question.
    2. Grounding: Construct a context-specific system prompt.
    3. Generation: Invoke the Gemini model to produce a hallucination-reduced response.
    """
    # 1. Retrieval
    retrieved_chunks = similarity_search_in_store(question, k=k)
    
    if not retrieved_chunks:
        return {
            "answer": "Please upload one or more PDF documents first before asking questions.",
            "sources": []
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
    
    # 3. Model generation
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
        
    try:
        model = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=api_key,
            temperature=0.2 # Lower temperature for factual retrieval
        )
        
        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=user_prompt)
        ]
        
        logger.info("Generating response from Gemini...")
        response = model.invoke(messages)
        answer = response.content
        
        return {
            "answer": answer,
            "sources": retrieved_chunks
        }
        
    except Exception as e:
        logger.error(f"Error in RAG generation: {e}")
        return {
            "answer": f"An error occurred while generating the response: {str(e)}",
            "sources": retrieved_chunks # Still return retrieved sources even if LLM fails
        }
