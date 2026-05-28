import os
import shutil
import json
import logging
import time
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
    Creates LangChain Document objects from chunks, adds them to FAISS in robust rate-limit aware batches,
    and persists the index. Handles 429 Resource Exhausted rate limits with retries and backoff.
    Updates the documents metadata JSON log.
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
    
    # Large files can produce hundreds of chunks, exceeding Gemini embedding minute quotas.
    # We batch the documents to avoid overloading, and implement retry logic on 429 errors.
    batch_size = 30
    total_docs = len(documents)
    logger.info(f"Indexing '{doc_name}' ({total_docs} chunks total) in batches of {batch_size}...")
    
    for idx in range(0, total_docs, batch_size):
        batch = documents[idx:idx+batch_size]
        max_retries = 5
        
        for attempt in range(max_retries):
            try:
                # Check if FAISS index files already exist
                index_exists = (
                    os.path.exists(FAISS_INDEX_PATH) and 
                    os.path.exists(os.path.join(FAISS_INDEX_PATH, "index.faiss"))
                )
                
                if not index_exists and idx == 0:
                    logger.info(f"Creating new FAISS index with batch {idx // batch_size + 1}...")
                    vector_store = FAISS.from_documents(batch, embeddings_model)
                else:
                    logger.info(f"Appending batch {idx // batch_size + 1} to existing FAISS index...")
                    vector_store = FAISS.load_local(
                        FAISS_INDEX_PATH, 
                        embeddings_model, 
                        allow_dangerous_deserialization=True
                    )
                    vector_store.add_documents(batch)
                
                # Save immediately to disk
                vector_store.save_local(FAISS_INDEX_PATH)
                break # Success! Break the retry loop for this batch.
                
            except Exception as e:
                # Catch Resource Exhausted (429) rate limit issues
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    sleep_duration = (attempt + 1) * 4
                    logger.warning(
                        f"Gemini Rate Limit (429) encountered. Attempt {attempt + 1}/{max_retries}. "
                        f"Sleeping for {sleep_duration}s before retry..."
                    )
                    time.sleep(sleep_duration)
                else:
                    logger.error(f"Failed to process batch {idx // batch_size + 1}: {e}")
                    raise e
        else:
            raise RuntimeError(f"Failed to index batch {idx // batch_size + 1} after {max_retries} rate-limit retries.")
            
    # Update documents metadata
    meta_list = load_documents_metadata()
    
    def normalize_name(name: str) -> str:
        if not name:
            return ""
        base = os.path.basename(name).lower()
        while base.endswith(".pdf.pdf"):
            base = base[:-4]
        return base
        
    norm_doc_name = normalize_name(doc_name)
    
    # Check if document already exists in metadata using normalized name matching
    meta_list = [m for m in meta_list if normalize_name(m["fileName"]) != norm_doc_name]
    meta_list.append({
        "fileName": doc_name,
        "fileSize": file_size,
        "chunksCount": len(chunks)
    })
    save_documents_metadata(meta_list)
    
    return len(chunks)

def similarity_search_in_store(query: str, k: int = 4, selected_files: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Performs hybrid, query-routed similarity search in the FAISS index with score thresholding.
    First detects if the query targets specific files based on filename keywords (Query Routing),
    then filters the FAISS index with robust case/extension-insensitive matching (Metadata-aware),
    and applies a similarity score threshold to discard low-quality/polluting chunks (Threshold Filtering).
    """
    if not os.path.exists(FAISS_INDEX_PATH) or not os.path.exists(os.path.join(FAISS_INDEX_PATH, "index.faiss")):
        logger.warning("FAISS index does not exist. No documents searched.")
        return []
        
    embeddings_model = get_embeddings_model()
    
    # Helper to normalize file names for resilient matching
    def normalize_name(name: str) -> str:
        if not name:
            return ""
        base = os.path.basename(name).lower()
        while base.endswith(".pdf.pdf"):
            base = base[:-4]
        return base

    try:
        vector_store = FAISS.load_local(
            FAISS_INDEX_PATH, 
            embeddings_model, 
            allow_dangerous_deserialization=True
        )
        
        # Load all metadata documents to find which ones are available
        all_metadata = load_documents_metadata()
        available_files = [m["fileName"] for m in all_metadata]
        
        # Determine active files based on selection list
        active_files = selected_files if selected_files else available_files
        
        # 1. QUERY ROUTING: Detect if query explicitly refers to any active document names
        query_lower = query.lower()
        routed_files = []
        for f in active_files:
            if not f:
                continue
            norm_f = normalize_name(f)
            name_without_ext = norm_f[:-4] if norm_f.endswith(".pdf") else norm_f
            
            # Check for direct match
            if name_without_ext in query_lower or query_lower in name_without_ext:
                routed_files.append(f)
                continue
                
            # Check for case study numbers specifically (e.g. "case study 4" -> "Case-Study-4-...")
            digits_in_file = [c for c in name_without_ext if c.isdigit()]
            if digits_in_file:
                for d in digits_in_file:
                    if d in query_lower and ("case" in query_lower or "study" in query_lower or "doc" in query_lower or "paper" in query_lower):
                        routed_files.append(f)
                        break
                if f in routed_files:
                    continue
                    
            # Check for significant keywords
            cleaned_name = name_without_ext.replace("-", " ").replace("_", " ").replace(":", " ")
            words = [w for w in cleaned_name.split() if len(w) > 2]
            matching_words = sum(1 for w in words if w in query_lower and w not in ["pdf", "doc", "vamsi", "kummara"])
            
            if matching_words >= 2 or (matching_words >= 1 and any(spec in cleaned_name for spec in ["case", "study", "intersecting", "lines", "habits"])):
                routed_files.append(f)
        
        # Use routed files if detected, otherwise fall back to all active files
        search_targets = routed_files if routed_files else active_files
        logger.info(f"Query routing resolved targets: {search_targets} (Original active: {active_files}, Query: '{query}')")
        
        # Define the robust metadata filter callable
        normalized_targets = [normalize_name(f) for f in search_targets if f]
        search_filter = lambda m: normalize_name(m.get("source", "")) in normalized_targets
        
        logger.info(f"Filtering FAISS search using normalized metadata targets: {normalized_targets}")
        
        # 2. SEMANTIC RETRIEVAL
        results_with_scores = vector_store.similarity_search_with_score(query, k=k, filter=search_filter, fetch_k=200)
        
        # If routed search returned no chunks, fall back to searching all active files
        if not results_with_scores and routed_files and active_files != routed_files:
            logger.warning(f"Routed search on {routed_files} returned no matches. Falling back to all active files: {active_files}")
            normalized_targets = [normalize_name(f) for f in active_files if f]
            search_filter = lambda m: normalize_name(m.get("source", "")) in normalized_targets
            results_with_scores = vector_store.similarity_search_with_score(query, k=k, filter=search_filter, fetch_k=200)
            
        formatted_results = []
        for doc, distance in results_with_scores:
            # L2 distance normalization (lower is better, 0.0 is perfect)
            similarity = 1.0 / (1.0 + distance)
            
            formatted_results.append({
                "text": doc.page_content,
                "document_name": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page"),
                "similarity_score": round(float(similarity), 4)
            })
            
        # Sort results by similarity score descending (Reranking)
        formatted_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        # 3. SCORE THRESHOLD FILTERING
        # Discard weak matches (L2 distance too large) to prevent context pollution.
        # But if we have routed files (meaning the user explicitly asked for them), 
        # we can be more lenient to ensure they get their summary.
        threshold = 0.54 if routed_files else 0.55
        filtered_results = [r for r in formatted_results if r["similarity_score"] >= threshold]
        
        # If threshold filters out everything but we have matches, keep the top 2 as a safe fallback
        if not filtered_results and formatted_results:
            logger.warning("All matches fell below similarity threshold. Keeping top 2 as fallback to prevent empty context.")
            filtered_results = formatted_results[:2]
            
        # Deduplicate chunks to keep context clean
        seen_texts = set()
        deduped_results = []
        for r in filtered_results:
            cleaned_text = r["text"].strip().lower()
            if cleaned_text not in seen_texts:
                seen_texts.add(cleaned_text)
                deduped_results.append(r)
                
        # Limit to top k
        final_results = deduped_results[:k]
        
        # Logs for debugging RAG quality
        logger.info(f"RAG Retrieval Summary:")
        logger.info(f"- Query: '{query}'")
        logger.info(f"- Selected Files: {selected_files}")
        logger.info(f"- Routed Files: {routed_files}")
        logger.info(f"- Raw Retrieved Chunks: {len(results_with_scores)}")
        logger.info(f"- Final Chunks (Threshold/Deduped/Top-k): {len(final_results)}")
        for idx, chunk in enumerate(final_results):
            logger.info(f"  [{idx+1}] File: '{chunk['document_name']}' | Page: {chunk['page']} | Score: {chunk['similarity_score']:.4f} | Snippet: {chunk['text'][:80]}...")
            
        return final_results
        
    except Exception as e:
        logger.error(f"Error performing similarity search: {e}", exc_info=True)
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
    
    def normalize_name(name: str) -> str:
        if not name:
            return ""
        base = os.path.basename(name).lower()
        while base.endswith(".pdf.pdf"):
            base = base[:-4]
        return base

    try:
        vector_store = FAISS.load_local(
            FAISS_INDEX_PATH, 
            embeddings_model, 
            allow_dangerous_deserialization=True
        )
        
        norm_doc_name = normalize_name(doc_name)
        chunks = []
        
        for doc in vector_store.docstore._dict.values():
            if normalize_name(doc.metadata.get("source")) == norm_doc_name:
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
    
    def normalize_name(name: str) -> str:
        if not name:
            return ""
        base = os.path.basename(name).lower()
        while base.endswith(".pdf.pdf"):
            base = base[:-4]
        return base

    try:
        vector_store = FAISS.load_local(
            FAISS_INDEX_PATH, 
            embeddings_model, 
            allow_dangerous_deserialization=True
        )
        
        norm_doc_name = normalize_name(doc_name)
        
        # Find keys to delete
        keys_to_delete = [
            doc_id for doc_id, doc in vector_store.docstore._dict.items()
            if normalize_name(doc.metadata.get("source")) == norm_doc_name
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
