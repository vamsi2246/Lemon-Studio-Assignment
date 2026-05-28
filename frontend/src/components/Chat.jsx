import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Terminal, ShieldAlert, BookOpen, MessageSquareDashed, Plus, Eraser, Clock, Layers } from "lucide-react";
import Message from "./Message";

const Chat = ({
  messages,
  onSendMessage,
  onClearConversation,
  onNewChat,
  loading,
  conversationTitle,
  hasDocuments,
  activeDocsCount
}) => {
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
    }
  }, [question]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    onSendMessage(question.trim());
    setQuestion("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const samplePrompts = [
    { text: "Summarize the key findings in these documents.", icon: <BookOpen className="h-3.5 w-3.5 text-blue-400" /> },
    { text: "List the limitations or risks outlined.", icon: <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> },
    { text: "Analyze the technical methodology used.", icon: <Terminal className="h-3.5 w-3.5 text-purple-400" /> },
  ];

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl border-zinc-800/80 overflow-hidden border">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900/80 bg-zinc-950/30 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <MessageSquareDashed className="h-4.5 w-4.5 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-100 truncate max-w-[240px]">
              {conversationTitle || "New Chat"}
            </h3>
            
            {/* Active Document query status indicators */}
            <div className="flex items-center gap-1.5 mt-0.5 select-none">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Focus:</span>
              {!hasDocuments ? (
                <span className="text-[9px] text-rose-450 font-bold bg-rose-950/20 border border-rose-900/30 px-1.5 py-0.2 rounded">
                  No Knowledge base
                </span>
              ) : activeDocsCount === 0 ? (
                <span className="text-[9px] text-rose-400 font-bold bg-rose-950/20 border border-rose-900/30 px-1.5 py-0.2 rounded animate-pulse">
                  0 Docs Active (Select below)
                </span>
              ) : (
                <span className="text-[9px] text-emerald-450 font-bold bg-emerald-950/20 border border-emerald-900/30 px-1.5 py-0.2 rounded flex items-center gap-1">
                  <Layers className="h-2 w-2" />
                  {activeDocsCount} active source{activeDocsCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <button
              onClick={onClearConversation}
              className="h-7 px-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear this conversation"
            >
              <Eraser className="h-3 w-3" />
              Clear
            </button>
          )}
          <button
            onClick={onNewChat}
            className="h-7 px-2.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-[10px] text-blue-400 border border-blue-500/20 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Start a new conversation"
          >
            <Plus className="h-3 w-3" />
            New Chat
          </button>
        </div>
      </div>

      {/* ── Message Stream ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-zinc-950/5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto p-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-zinc-800 flex items-center justify-center text-blue-400 mb-4 shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-150 mb-1">AI Contextual Discovery Engine</h4>
            <p className="text-xs text-zinc-555 leading-relaxed mb-6 max-w-sm">
              Ingest multiple PDFs in the document registry, activate specific source filters, and ask contextual questions.
            </p>

            <div className="w-full space-y-2.5 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 ml-1">Suggested prompts</span>
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuestion(prompt.text)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:bg-zinc-900/30 hover:border-zinc-850 text-xs text-zinc-400 hover:text-zinc-250 transition-all duration-200 cursor-pointer text-left group"
                >
                  <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-zinc-700">
                    {prompt.icon}
                  </div>
                  <span className="truncate">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="msg-enter">
              <Message 
                message={msg} 
                isStreaming={loading && index === messages.length - 1 && msg.role === "ai"}
              />
            </div>
          ))
        )}

        {/* Typing indicator / Search Skeleton loader */}
        {loading && (
          <div className="msg-enter flex w-full justify-start mb-4">
            <div className="flex items-start gap-2.5 max-w-[75%]">
              <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 shrink-0 mt-5">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <div className="flex flex-col space-y-1 min-w-[280px]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Processing RAG Query</span>
                <div className="glass-panel text-zinc-100 rounded-2xl rounded-tl-none px-4 py-3.5 border border-zinc-800/80 shadow-md space-y-2.5 relative overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium font-sans">Scanning vector spaces & formulating grounded response…</span>
                  </div>
                  {/* Premium Skeleton loader elements */}
                  <div className="space-y-1.5 mt-2">
                    <div className="h-2.5 bg-zinc-800/40 rounded w-full shimmer relative overflow-hidden" />
                    <div className="h-2.5 bg-zinc-800/40 rounded w-[92%] shimmer relative overflow-hidden" />
                    <div className="h-2.5 bg-zinc-800/40 rounded w-[78%] shimmer relative overflow-hidden" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="px-4 pb-4 pt-3 border-t border-zinc-900/60 bg-zinc-950/40 shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !hasDocuments
                ? "Please upload a document to begin querying..."
                : activeDocsCount === 0
                ? "Select at least one active document first!"
                : "Ask anything about your documents…"
            }
            disabled={loading || !hasDocuments || activeDocsCount === 0}
            rows={1}
            className="w-full pl-4 pr-12 py-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-zinc-100 text-sm placeholder-zinc-500 resize-none min-h-[46px] max-h-[140px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading || !hasDocuments || activeDocsCount === 0}
            className="absolute right-3 top-2.5 h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-900/80 disabled:text-zinc-650 text-white flex items-center justify-center transition-colors shadow-md disabled:shadow-none cursor-pointer border border-transparent disabled:border-zinc-800/60"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-zinc-600 font-medium">
            <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500">Enter</kbd> to send
            <span className="mx-1.5 text-zinc-700">·</span>
            <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-500">Shift+Enter</kbd> for newline
          </p>
          {messages.length > 0 && (
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {messages.filter(m => m.role === "ai").length} responses
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
