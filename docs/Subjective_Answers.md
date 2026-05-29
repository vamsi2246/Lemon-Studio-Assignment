# 📄 Subjective Round — Assignment Answers

> **Candidate**: Vamsi Kummara  
> **Project**: Lemon Studio — Enterprise Multi-Document RAG Assistant

---

## Q1. Explain the difference between a traditional keyword-based search system and a Retrieval-Augmented Generation (RAG) system. Where would you prefer using RAG over a normal search pipeline?

Traditional keyword-based search works by matching exact words or phrases from a user's query against an index of documents. It's fast, predictable, and easy to implement — but it has a fundamental limitation: it doesn't understand meaning. If a user searches for "employee benefits" but the document says "staff compensation package," a keyword search will miss it entirely.

RAG takes a fundamentally different approach. It converts both the user's query and document chunks into dense vector embeddings that capture semantic meaning, not just surface-level words. When a user asks a question, the system retrieves the most semantically relevant chunks from a vector database (like FAISS), then passes them as context to a Large Language Model which generates a coherent, grounded answer.

The key difference is that keyword search returns a list of matching documents and leaves interpretation to the user, while RAG actually synthesizes an answer from the retrieved context.

I would prefer RAG over traditional search in scenarios where:

- **Enterprise knowledge bases** — employees need precise answers from hundreds of internal PDFs, not a list of links
- **Customer support systems** — where natural language questions need direct answers
- **Research and legal document analysis** — where understanding context across multiple documents matters more than exact matches
- **Any domain where users ask questions in natural language** and expect synthesized, readable answers rather than raw search results

RAG isn't always better — for simple lookups or structured data queries, keyword search is faster and cheaper. But when semantic understanding matters, RAG is clearly the stronger choice.

---

## Q2. Suppose you are integrating an LLM into an existing workflow automation system. What factors would you consider before deploying it into production?

Deploying an LLM into production is very different from getting it to work in a demo. Here are the key factors I'd consider:

**Hallucination Control:** This is the biggest risk. LLMs can confidently generate incorrect information that looks perfectly legitimate. In production, I'd implement grounding techniques like RAG to anchor responses in real data, add explicit system prompts that instruct the model to refuse answering when context is insufficient, and build validation layers to catch obviously wrong outputs.

**Security & Privacy:** If the system handles sensitive data — customer records, financial documents, internal reports — you need strict controls. This includes ensuring data isn't leaked through API calls, implementing proper access controls, and making sure uploaded content is stored securely. In regulated industries, you may also need audit trails of every LLM interaction.

**Latency & Performance:** Users won't wait 15 seconds for an answer. I'd optimize by caching frequent queries, using streaming responses so users see partial results immediately, choosing the right model size (smaller models for simpler tasks), and implementing request queuing to handle concurrent users.

**Cost Management:** LLM API calls add up quickly at scale. Monitoring token usage per request, setting rate limits, batching where possible, and choosing cost-effective models for non-critical tasks are all essential. Running cost projections before launch prevents budget surprises.

**Scalability & Monitoring:** The system needs to handle growing traffic without breaking. This means implementing proper logging, tracking error rates, monitoring response quality over time, and setting up alerts for failures. Post-deployment, regular evaluation of response accuracy helps catch model drift or degradation.

Without addressing these factors upfront, even a technically impressive LLM integration can become a production liability.

---

## Q3. Describe a technical project where you built or contributed to a software application. What challenges did you face and how did you solve them?

### Project: Lemon Studio — Enterprise Multi-Document RAG Assistant

I built an enterprise-grade multi-document Retrieval-Augmented Generation platform that allows users to upload multiple PDF documents, semantically search across them, and ask contextual questions with AI-generated grounded responses.

**Tech Stack:** React (frontend), FastAPI (backend), FAISS (vector store), LangChain (orchestration), Google Gemini API (embeddings + generation), deployed on Vercel (frontend) and Render (backend with persistent disk).

**Architecture:** The system follows a clean pipeline architecture. PDFs are uploaded through the React frontend, parsed and chunked on the backend using sentence-aware splitting, embedded using Gemini's embedding model, and stored in a FAISS vector index on persistent storage. When a user asks a question, the system performs similarity search with metadata filtering, retrieves the top relevant chunks, and passes them as context to Gemini for response generation — with streaming support for real-time token delivery.

**Challenges & Solutions:**

The biggest challenge was **retrieval quality with multiple documents**. Initially, when several PDFs were uploaded, the FAISS search would return irrelevant chunks from unrelated documents. I solved this by implementing a hybrid retrieval strategy — combining query routing (detecting which documents the user is asking about), metadata-aware filtering (using normalized filename matching), and similarity score thresholding to discard weak matches.

Another significant challenge was **production deployment stability**. The Gemini embedding model I was originally using (`text-embedding-004`) got retired mid-development, causing 404 errors in production. I had to quickly migrate to `gemini-embedding-001`, rebuild the vector index, and implement proper startup validation that catches API issues immediately on server boot. I also ran into rate-limiting issues with the free-tier API — larger PDFs with 40+ chunks would exhaust the quota. I fixed this by reducing batch sizes, implementing exponential backoff with up to 8 retries, and adding inter-batch cooldowns.

**Learnings:** This project gave me hands-on experience with the full RAG lifecycle — from document ingestion and chunking strategies to vector search tuning and production deployment debugging. I learned that building a working demo is easy, but making it reliable in production requires careful error handling, API resilience, and constant iteration on retrieval quality.

---

*Last updated: May 2026*
