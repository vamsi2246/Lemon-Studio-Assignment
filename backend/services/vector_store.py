import os
import shutil
import json
import logging
from typing import List, Dict, Any, Optional
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from backend.services.embeddings import get_embeddings_model

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
FAISS_INDEX_PATH = os.path.join(DATA_DIR, "faiss_index")
METADATA_PATH = os.path.join(DATA_DIR, "documents.json")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def load_documents_metadata() -> List[Dict[str, Any]]:
    """Loads metadata for processed documents."""
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading metadata file: {e}")
            return []
    return []

def save_documents_metadata(metadata: List[Dict[str, Any]]):
    """Saves metadata for processed documents."""
    try:
        with open(METADATA_PATH, "w") as f:
            json.dump(metadata, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving metadata file: {e}")

def add_documents_to_store(chunks: List[Dict[str, Any]], doc_name: str, file_size: int) -> int:
    """
    Creates LangChain Document objects from chunks, adds them to FAISS, and persists the index.
    Updates the documents metadata json file.
    Returns the number of chunks added.
    """
    embeddings_model = get_embeddings_model()
    
    # Create LangChain documents
    documents = [
        Document(
            page_content=chunk["text"],
            metadata={
                "source": doc_name,
                "page": chunk["page"]
            }
        )
        for chunk in chunks
    ]
    
    # Check if vector store already exists
    if os.path.exists(FAISS_INDEX_PATH) and os.path.exists(os.path.join(FAISS_INDEX_PATH, "index.faiss")):
        try:
            logger.info("Loading existing FAISS index to add new documents...")
            vector_store = FAISS.load_local(
                FAISS_INDEX_PATH, 
                embeddings_model, 
                allow_dangerous_deserialization=True
            )
            vector_store.add_documents(documents)
            vector_store.save_local(FAISS_INDEX_PATH)
        except Exception as e:
            logger.error(f"Failed to append to FAISS, creating new: {e}")
            # If load fails, we can create from scratch
            vector_store = FAISS.from_documents(documents, embeddings_model)
            vector_store.save_local(FAISS_INDEX_PATH)
    else:
        logger.info("Creating new FAISS index...")
        vector_store = FAISS.from_documents(documents, embeddings_model)
        vector_store.save_local(FAISS_INDEX_PATH)
        
    # Update documents metadata
    meta_list = load_documents_metadata()
    # Check if document already exists in metadata
    meta_list = [m for m in meta_list if m["fileName"] != doc_name]
    meta_list.append({
        "fileName": doc_name,
        "fileSize": file_size,
        "chunksCount": len(chunks)
    })
    save_documents_metadata(meta_list)
    
    return len(chunks)

def similarity_search_in_store(query: str, k: int = 4, selected_files: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Performs similarity search in the FAISS index.
    Returns chunks with document metadata and normalized similarity scores.
    Can filter results based on selected_files list.
    """
    if not os.path.exists(FAISS_INDEX_PATH) or not os.path.exists(os.path.join(FAISS_INDEX_PATH, "index.faiss")):
        logger.warning("FAISS index does not exist. No documents searched.")
        return []
        
    embeddings_model = get_embeddings_model()
    try:
        vector_store = FAISS.load_local(
            FAISS_INDEX_PATH, 
            embeddings_model, 
            allow_dangerous_deserialization=True
        )
        
        # Prepare callable filter if selected_files list is defined
        search_filter = None
        if selected_files:
            search_filter = lambda m: m.get("source") in selected_files
            logger.info(f"Filtering search with selected files: {selected_files}")
            
        # similarity_search_with_score returns Tuple[Document, float] where float is L2 distance
        results_with_scores = vector_store.similarity_search_with_score(query, k=k, filter=search_filter)
        
        formatted_results = []
        for doc, distance in results_with_scores:
            # L2 distance: lower is better (0.0 is perfect match). 
            # Normalize to 0-1 similarity score: score = 1.0 / (1.0 + distance)
            similarity = 1.0 / (1.0 + distance)
            
            formatted_results.append({
                "text": doc.page_content,
                "document_name": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page"),
                "similarity_score": round(float(similarity), 4)
            })
            
        return formatted_results
    except Exception as e:
        logger.error(f"Error performing similarity search: {e}")
        return []

def clear_all_stores():
    """Purges the FAISS index and the documents metadata, resetting the backend."""
    # Delete FAISS directory
    if os.path.exists(FAISS_INDEX_PATH):
        shutil.rmtree(FAISS_INDEX_PATH)
        logger.info("Deleted FAISS index folder.")
        
    # Delete metadata file
    if os.path.exists(METADATA_PATH):
        os.remove(METADATA_PATH)
        logger.info("Deleted documents metadata file.")
        
    # Re-create empty metadata
    save_documents_metadata([])

def get_document_chunks(doc_name: str) -> List[str]:
    """
    Retrieves all text chunks associated with a specific document name from FAISS.
    Used primarily for generating document summaries.
    """
    if not os.path.exists(FAISS_INDEX_PATH) or not os.path.exists(os.path.join(FAISS_INDEX_PATH, "index.faiss")):
        return []
        
    embeddings_model = get_embeddings_model()
    try:
        vector_store = FAISS.load_local(
            FAISS_INDEX_PATH, 
            embeddings_model, 
            allow_dangerous_deserialization=True
        )
        
        # Access docstore to fetch chunks
        chunks = []
        # sort by page first if we can, to have ordered summary
        # we can get the underlying documents
        for doc in vector_store.docstore._dict.values():
            if doc.metadata.get("source") == doc_name:
                chunks.append((doc.metadata.get("page", 0), doc.page_content))
                
        # Sort by page number to keep reading flow
        chunks.sort(key=lambda x: x[0])
        return [c[1] for c in chunks]
    except Exception as e:
        logger.error(f"Error retrieving chunks for {doc_name}: {e}")
        return []

def delete_document_from_store(doc_name: str) -> bool:
    """
    Deletes all chunks associated with a specific document name from the FAISS index.
    Updates the documents metadata JSON log.
    If the index becomes empty, purges the local database files.
    """
    if not os.path.exists(FAISS_INDEX_PATH) or not os.path.exists(os.path.join(FAISS_INDEX_PATH, "index.faiss")):
        return False
        
    embeddings_model = get_embeddings_model()
    try:
        vector_store = FAISS.load_local(
            FAISS_INDEX_PATH, 
            embeddings_model, 
            allow_dangerous_deserialization=True
        )
        
        # Find keys to delete
        keys_to_delete = [
            doc_id for doc_id, doc in vector_store.docstore._dict.items()
            if doc.metadata.get("source") == doc_name
        ]
        
        if not keys_to_delete:
            logger.warning(f"No vector chunks found to delete for document: {doc_name}")
            return False
            
        logger.info(f"Deleting {len(keys_to_delete)} vector chunks for {doc_name} from FAISS...")
        
        # If we are deleting all documents, clear the entire store cleanly
        meta_list = load_documents_metadata()
        remaining_meta = [m for m in meta_list if m["fileName"] != doc_name]
        
        if not remaining_meta or len(vector_store.docstore._dict) <= len(keys_to_delete):
            clear_all_stores()
            logger.info("Vector store emptied and cleared.")
        else:
            # Delete and save FAISS
            vector_store.delete(keys_to_delete)
            vector_store.save_local(FAISS_INDEX_PATH)
            save_documents_metadata(remaining_meta)
            logger.info(f"FAISS index updated. Metadata updated for {len(remaining_meta)} remaining documents.")
            
        return True
    except Exception as e:
        logger.error(f"Error deleting document {doc_name} from vector store: {e}")
        return False
