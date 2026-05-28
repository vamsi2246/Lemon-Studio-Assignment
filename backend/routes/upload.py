from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import os
import shutil
import logging
from backend.models.schemas import DocumentMetadata, SummaryRequest, SummaryResponse
from backend.services.pdf_loader import extract_pdf_pages
from backend.services.chunking import chunk_pdf_pages
from backend.services.vector_store import (
    add_documents_to_store, 
    load_documents_metadata, 
    clear_all_stores,
    get_document_chunks,
    delete_document_from_store
)
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Documents"])

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "temp_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and index a single PDF document.
    Extracts text, segments it into semantic chunks, generates vector embeddings,
    and appends them to the persistent FAISS vector store.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    temp_file_path = os.path.join(TEMP_DIR, file.filename)
    
    try:
        # 1. Save uploaded file to temp directory
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size = os.path.getsize(temp_file_path)
        logger.info(f"Saved temp file {file.filename} ({file_size} bytes)")
        
        # 2. Extract text page-by-page
        pages_data = extract_pdf_pages(temp_file_path)
        if not pages_data:
            raise HTTPException(
                status_code=400, 
                detail="Could not extract any text from the PDF. It might be scanned or empty."
            )
            
        # 3. Perform sentence-aware chunking
        chunks = chunk_pdf_pages(pages_data, chunk_size=800, chunk_overlap=100)
        logger.info(f"Generated {len(chunks)} chunks for {file.filename}")
        
        # 4. Generate embeddings and save to FAISS
        num_chunks = add_documents_to_store(chunks, file.filename, file_size)
        
        return {
            "message": f"Document '{file.filename}' processed successfully: {num_chunks} chunks indexed.",
            "filename": file.filename,
            "chunksCount": num_chunks,
            "fileSize": file_size
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@router.get("/documents", response_model=List[DocumentMetadata])
async def get_uploaded_documents():
    """
    Retrieves the list of all currently indexed documents along with metadata.
    """
    try:
        return load_documents_metadata()
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve documents list.")

@router.post("/summarize", response_model=SummaryResponse)
async def summarize_document(request: SummaryRequest):
    """
    Generates a high-quality corporate/academic executive summary for a specific PDF.
    Retrieves relevant text chunks from the vector store and runs a summarization pipeline.
    """
    try:
        logger.info(f"Summarizing document: {request.fileName}")
        
        # 1. Fetch chunks
        chunks = get_document_chunks(request.fileName)
        if not chunks:
            raise HTTPException(
                status_code=404, 
                detail=f"No indexed text found for document '{request.fileName}'. Ensure it is uploaded."
            )
            
        # 2. Concatenate key text for the LLM context, keeping it within token bounds (approx 12-15k chars)
        max_chars = 15000
        concatenated_text = ""
        for chunk in chunks:
            if len(concatenated_text) + len(chunk) < max_chars:
                concatenated_text += chunk + "\n\n"
            else:
                concatenated_text += chunk[:max_chars - len(concatenated_text)]
                break
                
        # 3. Call Gemini model to summarize
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
            
        model = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=api_key,
            temperature=0.3
        )
        
        system_msg = (
            "You are an elite Enterprise AI Search Assistant. Create a highly professional, "
            "executive summary of the uploaded document based on the text segments provided below.\n\n"
            "Style rules:\n"
            "- Format in clean Markdown.\n"
            "- Start with an '# Executive Summary' header.\n"
            "- Add a '## Key Takeaways' section with bullet points.\n"
            "- Use bold styling, clean sections, and short professional paragraphs.\n"
            "- Make it look like a premium report that will impress corporate executives."
        )
        
        user_msg = f"Document content:\n{concatenated_text}"
        
        response = model.invoke([
            SystemMessage(content=system_msg),
            HumanMessage(content=user_msg)
        ])
        
        return {"summary": response.content}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error summarizing document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

@router.post("/clear")
async def clear_documents():
    """
    Clears all uploaded documents, deletes the persistent FAISS index,
    and resets the backend state.
    """
    try:
        clear_all_stores()
        # Clean temp directory too
        if os.path.exists(TEMP_DIR):
            shutil.rmtree(TEMP_DIR)
            os.makedirs(TEMP_DIR, exist_ok=True)
            
        return {"message": "All documents and vector store index cleared successfully."}
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset document index.")

@router.delete("/documents/{file_name}")
async def delete_document(file_name: str):
    """
    Deletes a specific document from the vector store index and metadata logs.
    """
    try:
        success = delete_document_from_store(file_name)
        if not success:
            raise HTTPException(
                status_code=404, 
                detail=f"Document '{file_name}' not found or could not be deleted from the index."
            )
        return {"message": f"Document '{file_name}' deleted successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in delete document endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
