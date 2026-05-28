import React, { useState } from "react";
import {
  FileText,
  Database,
  Trash2,
  Activity,
  Layers,
  BookOpen,
  Sparkles,
  X,
  FileCheck,
  Loader2,
  Plus,
  MessageSquare,
  ChevronRight,
  CheckSquare,
  Square
} from "lucide-react";
import Upload from "./Upload";
import API from "../services/api";

const Sidebar = ({
  documents,
  selectedDocs,
  setSelectedDocs,
  onUploadSuccess,
  onClearDocuments,
  loadingDocuments,
  conversations,
  activeConversationId,
  onNewChat,
  onSwitchConversation,
  onDeleteConversation,
}) => {
  const [summaryDoc, setSummaryDoc] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleSummarize = async (fileName) => {
    try {
      setSummaryDoc(fileName);
      setLoadingSummary(true);
      setShowSummaryModal(true);
      setSummaryText("");
      const res = await API.post("/summarize", { fileName });
      setSummaryText(res.data.summary);
    } catch (error) {
      setSummaryText(`### Error\n\n${error.response?.data?.detail || "Summarization failed."}`);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDeleteDoc = async (fileName) => {
    if (!window.confirm(`Delete '${fileName}' from the vector index?`)) return;
    try {
      await API.delete(`/documents/${encodeURIComponent(fileName)}`);
      // Update selected files local state
      setSelectedDocs(prev => prev.filter(name => name !== fileName));
      onUploadSuccess();
    } catch (error) {
      alert(error.response?.data?.detail || "Deletion failed.");
    }
  };

  const handleToggleDoc = (fileName) => {
    setSelectedDocs(prev =>
      prev.includes(fileName)
        ? prev.filter(name => name !== fileName)
        : [...prev, fileName]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(d => d.fileName));
    }
  };

  const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunksCount || 0), 0);

  // Truncate conversation title for sidebar display
  const truncate = (str, len = 28) => (str.length > len ? str.slice(0, len) + "…" : str);

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-zinc-800/80">
      {/* ── Brand Header ── */}
      <div className="flex items-center space-x-3 p-4 pb-3 border-b border-zinc-900/80 bg-zinc-950/20 shrink-0">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(59,130,246,0.25)]">
          ΛI
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-zinc-100">Lemon Studio</h2>
          <span className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider">Enterprise RAG v1.1</span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Upload Section */}
        <div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Upload Knowledge Base</h3>
          <Upload onUploadSuccess={onUploadSuccess} />
        </div>

        {/* Document Registry */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Document Registry ({documents.length})
              </h3>
              {documents.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer select-none"
                >
                  {selectedDocs.length === documents.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            {documents.length > 0 && (
              <button
                onClick={onClearDocuments}
                className="text-[9px] flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold uppercase tracking-wider py-0.5 px-1.5 rounded hover:bg-rose-950/20 transition-colors cursor-pointer border border-transparent"
              >
                <Trash2 className="h-2.5 w-2.5" />
                Purge
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
            {loadingDocuments ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-4.5 w-4.5 text-blue-500 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-5 border border-dashed border-zinc-900 rounded-xl text-center">
                <FileText className="h-5 w-5 text-zinc-700 mb-1" />
                <p className="text-[10px] text-zinc-650 font-medium">No documents indexed</p>
              </div>
            ) : (
              documents.map((doc, idx) => {
                const isSelected = selectedDocs.includes(doc.fileName);
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleDoc(doc.fileName)}
                    className={`group flex items-center gap-2.5 p-2 bg-zinc-950/20 hover:bg-zinc-900/30 rounded-lg border transition-all duration-150 cursor-pointer
                      ${isSelected ? "border-blue-500/20 bg-blue-950/5" : "border-zinc-900/80 hover:border-zinc-800"}`}
                  >
                    <div className="shrink-0">
                      {isSelected ? (
                        <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-zinc-300 truncate" title={doc.fileName}>
                        {doc.fileName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-zinc-600 font-mono">{formatBytes(doc.fileSize)}</span>
                        <span className="text-[9px] text-zinc-600">·</span>
                        <span className="text-[9px] text-zinc-600 font-mono">{doc.chunksCount} chunks</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleSummarize(doc.fileName)}
                        className="h-6 px-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-blue-600 text-[9px] text-zinc-400 hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Generate Summary"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.fileName)}
                        className="h-6 w-6 rounded bg-zinc-900 border border-zinc-800 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-450 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Index"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Conversation History ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Chat History ({conversations.length})
            </h3>
            <button
              onClick={onNewChat}
              className="h-5 w-5 rounded bg-zinc-900 hover:bg-blue-600/20 text-zinc-400 hover:text-blue-400 flex items-center justify-center transition-colors cursor-pointer border border-zinc-800"
              title="New Chat"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-1 max-h-[170px] overflow-y-auto pr-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSwitchConversation(conv.id)}
                className={`conv-item flex items-center gap-2 p-2 rounded-lg border cursor-pointer group
                  ${conv.id === activeConversationId
                    ? "active border-blue-500/20 bg-blue-950/5"
                    : "border-transparent hover:border-zinc-900 hover:bg-zinc-900/10"
                  }`}
              >
                <MessageSquare
                  className={`h-3.5 w-3.5 shrink-0 ${
                    conv.id === activeConversationId ? "text-blue-400" : "text-zinc-650"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium truncate flex-1 ${
                    conv.id === activeConversationId ? "text-zinc-200" : "text-zinc-500"
                  }`}
                >
                  {truncate(conv.title)}
                </span>
                {conv.messages.length > 0 && (
                  <span className="text-[9px] text-zinc-600 font-mono shrink-0 px-1 bg-zinc-900/50 rounded">
                    {conv.messages.filter((m) => m.role === "ai").length}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="h-5 w-5 rounded flex items-center justify-center text-zinc-600 hover:text-rose-450 hover:bg-rose-950/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                  title="Delete Chat"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Analytics ── */}
      <div className="p-4 pt-3 border-t border-zinc-900/60 bg-zinc-950/30 shrink-0 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-950/40 border border-zinc-900/80 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-600 mb-0.5">
              <Layers className="h-2.5 w-2.5" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Active</span>
            </div>
            <p className="text-xs font-bold text-zinc-300">
              {selectedDocs.length} / {documents.length}
            </p>
          </div>
          <div className="bg-zinc-950/40 border border-zinc-900/80 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-600 mb-0.5">
              <Database className="h-2.5 w-2.5" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Chunks</span>
            </div>
            <p className="text-xs font-bold text-zinc-300">{totalChunks}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-650 bg-zinc-950/40 border border-zinc-900/80 rounded-lg py-1.5 px-2.5">
          <div className="flex items-center gap-1.5">
            <Activity className="h-2.5 w-2.5 text-emerald-500 animate-pulse" />
            <span>FAISS Engine</span>
          </div>
          <span className="font-bold text-emerald-400">ONLINE</span>
        </div>
      </div>

      {/* ── Summary Modal ── */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-900/20">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Document Digest</h3>
                  <p className="text-[10px] text-zinc-500 truncate max-w-[350px]">{summaryDoc}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="h-7 w-7 rounded-lg hover:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingSummary ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
                  <p className="text-xs text-zinc-400 font-medium animate-pulse">Generating executive brief…</p>
                </div>
              ) : (
                <div className="markdown-content text-sm leading-relaxed text-zinc-300">
                  {summaryText.split("\n\n").map((para, i) => {
                    if (para.startsWith("# ")) return <h1 key={i} className="text-lg font-bold text-zinc-100 mb-2">{para.replace("# ", "")}</h1>;
                    if (para.startsWith("## ")) return <h2 key={i} className="text-base font-bold text-zinc-100 mt-3 mb-1.5">{para.replace("## ", "")}</h2>;
                    if (para.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold text-zinc-200 mt-2 mb-1">{para.replace("### ", "")}</h3>;
                    if (para.startsWith("- ") || para.startsWith("* ")) {
                      return (
                        <ul key={i} className="list-disc pl-5 mb-2 space-y-0.5 text-zinc-300">
                          {para.split("\n").map((item, idx) => <li key={idx}>{item.replace(/^[-*]\s+/, "")}</li>)}
                        </ul>
                      );
                    }
                    return <p key={i} className="mb-2 text-zinc-300 leading-relaxed">{para}</p>;
                  })}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-zinc-900 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
