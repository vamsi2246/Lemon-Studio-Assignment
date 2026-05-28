import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Chat from "../components/Chat";
import API from "../services/api";

// Generate a unique ID for conversations
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const Home = () => {
  // ─── Conversation State ───────────────────────────
  const [conversations, setConversations] = useState([
    { id: uid(), title: "New Chat", messages: [], createdAt: Date.now() },
  ]);
  const [activeId, setActiveId] = useState(null);

  // ─── Document State ───────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // ─── Chat State ───────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ─── Resizable Panel State ────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const isResizing = useRef(false);
  const containerRef = useRef(null);

  // Initialize activeId
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, []);

  // ─── Auto-select newly uploaded documents ──────────
  useEffect(() => {
    setSelectedDocs((prev) => {
      const docNames = documents.map((d) => d.fileName);
      // Retain previously selected documents that are still in the current indexed list
      const stillExisting = prev.filter((name) => docNames.includes(name));
      // Auto-select any newly ingested documents
      const newlyAdded = docNames.filter((name) => !prev.includes(name));
      return [...stillExisting, ...newlyAdded];
    });
  }, [documents]);

  // ─── Active Conversation Helper ───────────────────
  const activeConv = conversations.find((c) => c.id === activeId) || conversations[0];
  const messages = activeConv?.messages || [];

  // ─── Update messages in the active conversation ───
  const updateActiveMessages = useCallback((updater) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: typeof updater === "function" ? updater(c.messages) : updater } : c
      )
    );
  }, [activeId]);

  // ─── Conversation Management ──────────────────────
  const handleNewChat = () => {
    const newConv = { id: uid(), title: "New Chat", messages: [], createdAt: Date.now() };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  const handleSwitchConversation = (id) => {
    setActiveId(id);
  };

  const handleDeleteConversation = (id) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const newConv = { id: uid(), title: "New Chat", messages: [], createdAt: Date.now() };
        setActiveId(newConv.id);
        return [newConv];
      }
      if (activeId === id) {
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleClearConversation = () => {
    updateActiveMessages([]);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, title: "New Chat", messages: [] } : c))
    );
  };

  // ─── Document Fetching ────────────────────────────
  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await API.get("/documents");
      setDocuments(res.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUploadSuccess = () => fetchDocuments();

  const handleClearDocuments = async () => {
    if (!window.confirm("Clear entire knowledge index? All documents and embeddings will be deleted.")) return;
    try {
      setLoadingDocs(true);
      await API.post("/clear");
      setDocuments([]);
      setSelectedDocs([]);
    } catch (error) {
      console.error("Error clearing index:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  // ─── Chat Send ────────────────────────────────────
  const handleSendMessage = async (text) => {
    try {
      setLoading(true);
      const userMsg = { role: "user", text };
      updateActiveMessages((prev) => [...prev, userMsg]);

      // Auto-title the conversation from first user message
      if (activeConv.messages.length === 0) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, title: text.slice(0, 50) + (text.length > 50 ? "…" : "") } : c))
        );
      }

      // Pass selected_files in request to filter references.
      // If no documents are selected, warn the user.
      if (documents.length > 0 && selectedDocs.length === 0) {
        const warningMsg = {
          role: "ai",
          text: "⚠️ **No documents are active.** Please check at least one document in the sidebar registry to search or answer questions against.",
          sources: [],
          latency_ms: 0
        };
        updateActiveMessages((prev) => [...prev, warningMsg]);
        return;
      }

      // Restrict query to selected files
      const payload = {
        question: text,
        selected_files: selectedDocs.length === documents.length ? null : selectedDocs
      };

      const res = await API.post("/chat", payload);

      const aiMsg = {
        role: "ai",
        text: res.data.answer,
        sources: res.data.sources,
        latency_ms: res.data.latency_ms,
      };
      updateActiveMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("RAG pipeline failure:", error);
      const errorMsg = {
        role: "ai",
        text: `**Error**: ${error.response?.data?.detail || "Failed to generate RAG response."}`,
        sources: [],
      };
      updateActiveMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Resizable Panel Logic ────────────────────────
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.min(Math.max(e.clientX - rect.left - 16, 260), 520);
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // ─── Render ───────────────────────────────────────
  return (
    <div className="h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-white overflow-hidden">
      {/* Ambient gradient top bar */}
      <div className="h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 w-full shrink-0" />

      {/* Main workspace container */}
      <div ref={containerRef} className="flex-1 flex p-3 md:p-4 gap-0 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="shrink-0 h-full" style={{ width: sidebarWidth }}>
          <Sidebar
            documents={documents}
            selectedDocs={selectedDocs}
            setSelectedDocs={setSelectedDocs}
            onUploadSuccess={handleUploadSuccess}
            onClearDocuments={handleClearDocuments}
            loadingDocuments={loadingDocs}
            conversations={conversations}
            activeConversationId={activeId}
            onNewChat={handleNewChat}
            onSwitchConversation={handleSwitchConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>

        {/* ── Resizable Drag Handle ── */}
        <div
          className={`resize-handle ${isResizing.current ? "active" : ""}`}
          onMouseDown={handleMouseDown}
        />

        {/* ── Chat Workspace ── */}
        <div className="flex-1 h-full min-w-0">
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearConversation={handleClearConversation}
            onNewChat={handleNewChat}
            loading={loading}
            conversationTitle={activeConv?.title}
            hasDocuments={documents.length > 0}
            activeDocsCount={selectedDocs.length}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;