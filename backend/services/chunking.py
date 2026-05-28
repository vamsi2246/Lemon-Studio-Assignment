from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict, Any

def chunk_pdf_pages(pages_data: List[Dict[str, Any]], chunk_size: int = 800, chunk_overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Chunks a list of pages using LangChain's RecursiveCharacterTextSplitter.
    Preserves page metadata mapping for each chunk.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    
    all_chunks = []
    for page_item in pages_data:
        text = page_item["text"]
        page_num = page_item["page"]
        
        # Split text on this specific page
        splits = text_splitter.split_text(text)
        
        for split in splits:
            split_cleaned = split.strip()
            if split_cleaned:
                all_chunks.append({
                    "text": split_cleaned,
                    "page": page_num
                })
                
    return all_chunks
