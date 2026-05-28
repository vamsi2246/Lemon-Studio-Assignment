import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Chat from "../components/Chat";
import API from "../services/api";

const Home = () => {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // 1. Fetch uploaded documents from the server
  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await API.get("/documents");
      setDocuments(res.data);
    } catch (error) {
      console.error("Error fetching documents registry:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // 2. Add uploaded document metadata to local registry
  const handleUploadSuccess = () => {
    // Re-fetch all documents from backend to ensure we have precise sizes and chunk counts
    fetchDocuments();
  };

  // 3. Clear all documents in FAISS index and local database
  const handleClearDocuments = async () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear the entire knowledge index? This will delete all uploaded files and FAISS embeddings."
    );
    if (!confirmClear) return;

    try {
      setLoadingDocs(true);
      await API.post("/clear");
      setDocuments([]);
      setMessages([]); // Clear chat session as references are deleted
      alert("System indexes purged successfully.");
    } catch (error) {
      console.error("Error clearing index:", error);
      alert("Failed to reset system database.");
    } finally {
      setLoadingDocs(false);
    }
  };

  // 4. Submit questions to the RAG chat pipeline
  const handleSendMessage = async (text) => {
    try {
      setLoading(true);

      // Append user prompt immediately to chat timelines
      const userMsg = { role: "user", text };
      setMessages((prev) => [...prev, userMsg]);

      // Call FastAPI backend
      const res = await API.post("/chat", { question: text });

      // Append AI reply with citations
      const aiMsg = {
        role: "ai",
        text: res.data.answer,
        sources: res.data.sources,
        latency_ms: res.data.latency_ms,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("RAG pipeline chat failure:", error);
      
      const errorMsg = {
        role: "ai",
        text: `**Connection Error**: Failed to query the knowledge database. ${
          error.response?.data?.detail || "Please verify your FastAPI server is online and running."
        }`,
        sources: [],
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-white">
      {/* Decorative top ambient glow line */}
      <div className="h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 w-full" />
      
      {/* Dashboard Canvas Container */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 max-h-screen overflow-hidden">
        
        {/* Sidebar panel (Uploader, Documents List, System Stats) */}
        <div className="w-full lg:w-[350px] shrink-0 h-[45vh] lg:h-[calc(100vh-50px)]">
          <Sidebar
            documents={documents}
            onUploadSuccess={handleUploadSuccess}
            onClearDocuments={handleClearDocuments}
            loadingDocuments={loadingDocs}
          />
        </div>

        {/* Chat Area Canvas (Timeline stream, Prompts suggestion, Text Entry field) */}
        <div className="flex-1 h-[50vh] lg:h-[calc(100vh-50px)]">
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loading}
          />
        </div>

      </div>
    </div>
  );
};

export default Home;