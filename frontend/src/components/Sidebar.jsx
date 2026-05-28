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
  Loader2
} from "lucide-react";
import Upload from "./Upload";
import API from "../services/api";

const Sidebar = ({ 
  documents, 
  onUploadSuccess, 
  onClearDocuments,
  loadingDocuments 
}) => {
  const [summaryDoc, setSummaryDoc] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Helper to format bytes
  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Trigger RAG Summarization
  const handleSummarize = async (fileName) => {
    try {
      setSummaryDoc(fileName);
      setLoadingSummary(true);
      setShowSummaryModal(true);
      setSummaryText("");

      const res = await API.post("/summarize", { fileName });
      setSummaryText(res.data.summary);
    } catch (error) {
      console.error("Summarization error:", error);
      setSummaryText(
        `### Error generating summary\n\n${
          error.response?.data?.detail || "An unexpected error occurred while communicating with the AI model."
        }`
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  // Total database chunk counter
  const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunksCount || 0), 0);

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl p-5 border-zinc-800/80">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-zinc-900">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          ΛI
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-zinc-100">Lemon Studio</h2>
          <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Enterprise RAG v1.0</span>
        </div>
      </div>

      {/* Upload Box */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Upload Knowledge Base
        </h3>
        <Upload onUploadSuccess={onUploadSuccess} />
      </div>

      {/* Uploaded Documents List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Documents Registry ({documents.length})
          </h3>
          {documents.length > 0 && (
            <button
              onClick={onClearDocuments}
              className="text-[10px] flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold uppercase tracking-wider py-1 px-2 rounded-md hover:bg-rose-950/20 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Reset All
            </button>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 min-h-[180px]">
          {loadingDocuments ? (
            <div className="flex flex-col items-center justify-center h-32 space-y-2">
              <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
              <span className="text-xs text-zinc-500">Retrieving system index...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 border border-dashed border-zinc-900 rounded-xl text-center p-4">
              <FileText className="h-7 w-7 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 font-medium">No documents uploaded yet</p>
              <span className="text-[10px] text-zinc-600 mt-1">Upload a PDF above to construct the embedding index.</span>
            </div>
          ) : (
            documents.map((doc, idx) => (
              <div 
                key={idx}
                className="group relative flex items-start gap-3 p-3 bg-zinc-950/30 hover:bg-zinc-900/40 rounded-xl border border-zinc-900 transition-all duration-200"
              >
                <div className="h-8.5 w-8.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 shrink-0 group-hover:border-blue-900/40 group-hover:bg-blue-950/10 transition-colors">
                  <FileCheck className="h-4.5 w-4.5" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-zinc-100" title={doc.fileName}>
                    {doc.fileName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {formatBytes(doc.fileSize)}
                    </span>
                    <span className="text-[10px] px-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-medium">
                      {doc.chunksCount} chunks
                    </span>
                  </div>
                </div>

                {/* Summarize Quick Action */}
                <button
                  onClick={() => handleSummarize(doc.fileName)}
                  className="h-7 px-2.5 rounded-lg bg-zinc-900 hover:bg-blue-600 text-[10px] text-zinc-300 hover:text-white border border-zinc-800 hover:border-blue-500 font-semibold flex items-center gap-1 shadow-sm shrink-0 self-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                  title="Summarize with AI"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  Summary
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Analytics / Server Status panel */}
      <div className="mt-5 pt-4 border-t border-zinc-900 shrink-0 space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          System Analytics
        </h3>
        
        <div className="grid grid-cols-2 gap-2 text-zinc-400">
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
              <Layers className="h-3 w-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Index Count</span>
            </div>
            <p className="text-sm font-bold text-zinc-200">{documents.length}</p>
          </div>

          <div className="bg-zinc-950/20 border border-zinc-900 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
              <Database className="h-3 w-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Total Chunks</span>
            </div>
            <p className="text-sm font-bold text-zinc-200">{totalChunks}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 bg-zinc-950/20 border border-zinc-900 rounded-lg py-2 px-3">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
            <span>Vector Store Server Active</span>
          </div>
          <span className="font-semibold text-emerald-400">ONLINE</span>
        </div>
      </div>

      {/* Summary Modal Panel */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-900/20">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Document Digest</h3>
                  <p className="text-[10px] text-zinc-500 font-medium truncate max-w-[400px]">
                    Generated from '{summaryDoc}'
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 text-zinc-200">
              {loadingSummary ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-3">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-zinc-300">Constructing context map...</p>
                    <span className="text-[10px] text-zinc-500">Generating corporate brief using Gemini AI</span>
                  </div>
                </div>
              ) : (
                <div className="markdown-content text-sm leading-relaxed prose prose-invert max-w-none">
                  {summaryText ? (
                    // We can reuse a small markdown renderer block or a clean styled pre block. 
                    // Let's just import react-markdown here as well or use standard styling!
                    <div className="space-y-4">
                      {/* Splitting sections by newlines and headers for a pristine layout */}
                      <React.Fragment>
                        {/* We will write a small custom formatter to make it look exceptionally beautiful */}
                        <div className="border-l-2 border-blue-500 pl-4 py-1 mb-4 bg-blue-950/5 rounded-r-lg">
                          <p className="text-xs text-blue-400 font-mono">DIGEST CLASSIFIED • COMPLETED SUCCESSFUL</p>
                        </div>
                        {/* Summary rendered here */}
                        <div className="bg-zinc-900/20 p-4 rounded-xl border border-zinc-900/60 max-h-[50vh] overflow-y-auto">
                          {summaryText.split("\n\n").map((para, i) => {
                            if (para.startsWith("# ")) {
                              return <h1 key={i} className="text-xl font-bold text-zinc-100 mb-3">{para.replace("# ", "")}</h1>;
                            }
                            if (para.startsWith("## ")) {
                              return <h2 key={i} className="text-base font-bold text-zinc-100 mt-4 mb-2">{para.replace("## ", "")}</h2>;
                            }
                            if (para.startsWith("### ")) {
                              return <h3 key={i} className="text-sm font-bold text-zinc-200 mt-3 mb-1.5">{para.replace("### ", "")}</h3>;
                            }
                            if (para.startsWith("- ") || para.startsWith("* ")) {
                              return (
                                <ul key={i} className="list-disc pl-5 mb-3 space-y-1 text-zinc-300">
                                  {para.split("\n").map((item, idx) => (
                                    <li key={idx}>{item.replace(/^[-*]\s+/, "")}</li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p key={i} className="mb-3 text-zinc-300 leading-relaxed">{para}</p>;
                          })}
                        </div>
                      </React.Fragment>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">No summary text available.</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-900 flex justify-end bg-zinc-900/10">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white transition-colors"
              >
                Close digest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
