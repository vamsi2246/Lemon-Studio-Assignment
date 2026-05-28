from fastapi import APIRouter, HTTPException
from backend.models.schemas import QueryRequest, QueryResponse
from backend.services.rag_pipeline import generate_rag_response
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Query"])

@router.post("/chat", response_model=QueryResponse)
async def chat_with_docs(request: QueryRequest):
    """
    RAG Endpoint. Processes the user question, retrieves relevant vector chunks
    from the FAISS index, and generates a context-grounded response.
    """
    try:
        logger.info(f"Received chat request: {request.question}")
        response = generate_rag_response(request.question)
        return response
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
