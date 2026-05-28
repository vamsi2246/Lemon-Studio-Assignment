from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.models.schemas import QueryRequest, QueryResponse
from backend.services.rag_pipeline import generate_rag_response, generate_rag_response_stream
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Query"])

@router.post("/chat", response_model=QueryResponse)
async def chat_with_docs(request: QueryRequest):
    """
    Standard static RAG Endpoint. Processes the user question, retrieves relevant vector chunks
    from the FAISS index, and generates a context-grounded response.
    Supports optional document selection filtering and chat memory.
    """
    try:
        logger.info(f"Received static chat request: {request.question} (filters: {request.selected_files})")
        response = generate_rag_response(
            question=request.question,
            selected_files=request.selected_files,
            history=request.history
        )
        return response
    except Exception as e:
        logger.error(f"Error in static chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/chat/stream")
async def chat_with_docs_stream(request: QueryRequest):
    """
    Premium Server-Sent Events (SSE) Streaming RAG Endpoint.
    Retrieves vector chunks first, outputs retrieved chunks as 'sources' event,
    and then streams LLM tokens as 'token' events, ending with a 'done' event.
    Supports selective document querying and chat memory.
    """
    try:
        logger.info(f"Received streaming chat request: {request.question} (filters: {request.selected_files})")
        generator = generate_rag_response_stream(
            question=request.question,
            selected_files=request.selected_files,
            history=request.history
        )
        return StreamingResponse(generator, media_type="text/event-stream")
    except Exception as e:
        logger.error(f"Error in streaming chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
