# 📝 MCQ Round — Assignment Answers

> **Candidate**: Vamsi Kummara  
> **Project**: Lemon Studio — Enterprise Multi-Document RAG Assistant

---

## Q1. Which of the following is the primary purpose of embeddings in a Retrieval-Augmented Generation (RAG) pipeline?

**✅ Answer:** To convert text into numerical vectors that capture semantic meaning.

**Explanation:**  
Embeddings transform raw text into dense numerical vectors where semantically similar content ends up close together in vector space. This is what makes RAG powerful — instead of relying on exact keyword matches, the system can find contextually relevant chunks even when the wording is completely different from the query. Without embeddings, there's no way to perform meaningful similarity search across documents.

---

## Q2. Which HTTP method is most appropriate for creating a new resource through a REST API?

**✅ Answer:** POST

**Explanation:**  
POST is the standard HTTP method for creating new resources on a server. In REST conventions, GET is for reading, PUT/PATCH for updating, and DELETE for removing. When our RAG backend receives a PDF upload at `POST /api/upload`, it creates a new indexed document resource — which is exactly what POST is designed for.

---

## Q3. In React, which concept is primarily used to manage component-level dynamic data?

**✅ Answer:** State

**Explanation:**  
State is React's built-in mechanism for storing data that changes over time within a component. When state updates, React automatically re-renders the component to reflect the new values in the UI. For example, in our RAG frontend, we use state to track the list of uploaded documents, the current chat messages, and loading indicators — all of which change dynamically as the user interacts with the app.

---

## Q4. What is one major advantage of using FastAPI or Express.js for backend services?

**✅ Answer:** Fast API development and efficient request handling.

**Explanation:**  
Both frameworks dramatically reduce boilerplate and speed up backend development. FastAPI in particular provides automatic request validation through Pydantic models, built-in interactive API docs (Swagger UI), and native async support — which means you can handle concurrent requests efficiently without complex threading. This made it ideal for our RAG backend where PDF processing and embedding generation happen asynchronously.

---

## Q5. In a Gen-AI application, hallucination refers to:

**✅ Answer:** Generating incorrect or fabricated information that appears believable.

**Explanation:**  
Hallucination is when an LLM confidently produces information that sounds correct but is actually made up or factually wrong. This is one of the main reasons RAG exists — by grounding the model's responses in actual retrieved document content, we significantly reduce the chance of hallucinated answers. In our project, the system prompt explicitly instructs Gemini to only use the provided context and refuse to answer if the information isn't found.

---

*Last updated: May 2026*
