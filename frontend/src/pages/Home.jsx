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

  // ─── Chat Stream Send ─────────────────────────────
  const handleSendMessage = async (text) => {
    try {
      setLoading(true);
      const userMsg = { role: "user", text };
      
      // Auto-title the conversation from first user message
      if (messages.length === 0) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, title: text.slice(0, 50) + (text.length > 50 ? "…" : "") } : c))
        );
      }

      // Map conversation history memory (last 8 messages for optimal token window)
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // Append user message and insert a blank placeholder AI message to stream tokens into
      updateActiveMessages((prev) => [
        ...prev,
        userMsg,
        { role: "ai", text: "", sources: [], latency_ms: 0 }
      ]);

      // If no documents are active, trigger a visual warning response
      if (documents.length > 0 && selectedDocs.length === 0) {
        updateActiveMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "ai") {
            last.text = "⚠️ **No documents are active.** Please check at least one document in the sidebar registry to search or answer questions against.";
          }
          return next;
        });
        setLoading(false);
        return;
      }

      const payload = {
        question: text,
        selected_files: selectedDocs.length === documents.length ? null : selectedDocs,
        history: historyPayload,
      };

      // Perform a premium fetch reader request to consume the SSE text/event-stream
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Streaming failed with status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // Retain incomplete buffer parts

        for (const line of lines) {
          if (!line.trim()) continue;

          // Parse SSE Event format: "event: [type]\ndata: [json]"
          const eventMatch = line.match(/^event:\s*(.+)$/m);
          const dataMatch = line.match(/^data:\s*(.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1].trim();
            const rawData = dataMatch[1].trim();

            try {
              const parsedData = JSON.parse(rawData);
              
              if (eventType === "sources") {
                updateActiveMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === "ai") {
                    last.sources = parsedData;
                  }
                  return next;
                });
              } else if (eventType === "token") {
                updateActiveMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === "ai") {
                    // Instantly append token to the active stream bubble
                    last.text += parsedData;
                  }
                  return next;
                });
              } else if (eventType === "done") {
                updateActiveMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === "ai") {
                    last.latency_ms = parsedData.latency_ms;
                  }
                  return next;
                });
              }
            } catch (jsonErr) {
              console.error("Failed to parse SSE event data:", jsonErr);
            }
          }
        }
      }
    } catch (error) {
      console.error("RAG pipeline streaming failure:", error);
      updateActiveMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "ai") {
          last.text = `**Error**: Failed to generate stream response. Ensure the backend is active.`;
        }
        return next;
      });
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