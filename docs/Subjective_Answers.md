Q1. Explain the difference between a traditional keyword-based search system and a Retrieval-Augmented Generation (RAG) system. Where would you prefer using RAG over a normal search pipeline?

A1. Traditional keyword-based search works by matching exact words from the user's query against stored documents. It's fast and simple but fails when the user uses different wording than what's in the document. For example, searching "employee benefits" won't match a document that says "staff compensation package."

RAG works differently. It first converts text into vector embeddings that capture meaning, stores them in a vector database like FAISS, and retrieves the most semantically relevant chunks when a user asks a question. These retrieved chunks are then passed as context to an LLM, which generates a grounded answer based on actual document content.

I would prefer RAG over normal search when working with enterprise knowledge bases, internal documentation, legal contracts, or any scenario where users ask natural language questions and expect synthesized answers instead of just a list of matching documents. RAG also helps reduce hallucinations since the model's response is grounded in real retrieved content.


Q2. Suppose you are integrating an LLM into an existing workflow automation system. What factors would you consider before deploying it into production?

A2. Before deploying an LLM into production, I would consider these key factors:

Hallucination control - LLMs can generate confident but incorrect answers. Using RAG or grounding techniques helps keep responses factual. Adding system prompts that instruct the model to say "I don't know" when context is missing also helps.

Security and privacy - If the system handles sensitive data, we need to make sure user inputs and documents are not leaked through API calls. Proper access controls and data encryption are essential.

Latency - Users expect fast responses. Using streaming (SSE), caching frequent queries, and picking the right model size for the task helps keep response times low.

Cost - LLM API calls can get expensive at scale. Monitoring token usage, setting rate limits, and using smaller models for simpler tasks helps manage costs.

Scalability - The system should handle growing traffic. This means proper load balancing, async processing, and potentially moving to managed vector databases.

Monitoring - After deployment, we need logging, error tracking, and user feedback loops to catch issues early and improve the system over time.


Q3. Describe a technical project where you built or contributed to a software application. What challenges did you face and how did you solve them?

A3. I built an Enterprise Multi-Document RAG Assistant called Lemon Studio using React, FastAPI, FAISS, LangChain, and Google Gemini API.

The objective was to let users upload multiple PDF documents, search across them semantically, and get AI-generated answers grounded in the actual document content. The frontend was built with React and Tailwind CSS, and the backend used FastAPI with FAISS as the vector store.

The workflow is: PDFs get uploaded, parsed page-by-page using PyPDF, split into chunks with overlap, embedded using Gemini's embedding model, and stored in FAISS. When a user asks a question, the system finds the most relevant chunks through similarity search, passes them as context to Gemini, and streams the response back in real-time using Server-Sent Events.

One challenge I faced was retrieval quality when multiple documents were uploaded. Unrelated chunks from other documents were polluting the context. I solved this by implementing document-targeted query routing and metadata filtering, so the search only looks at relevant files based on what the user is asking about.

Another challenge was production deployment issues. The embedding model I was using (text-embedding-004) got deprecated and started returning 404 errors. I had to migrate to gemini-embedding-001 and rebuild the entire vector index. I also hit rate limiting issues with the free tier API when processing large PDFs, which I fixed by reducing batch sizes and adding exponential backoff with retries.

Through this project I learned how RAG systems actually work end-to-end, how to handle real production issues like API deprecation and rate limiting, and how important retrieval quality tuning is for getting good answers from the LLM.
