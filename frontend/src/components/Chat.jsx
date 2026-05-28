import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Terminal, ShieldAlert, BookOpen, MessageSquareDashed } from "lucide-react";
import Message from "./Message";

const Chat = ({ messages, onSendMessage, loading }) => {
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    
    onSendMessage(question.trim());
    setQuestion("");
  };

  // Keyboard shortcut: Send on Enter, allow shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  // Quick prepopulated prompts
  const samplePrompts = [
    { text: "Synthesize the core message of these files.", icon: <BookOpen className="h-3 w-3 text-blue-400" /> },
    { text: "List the structural flaws or limitations outlined.", icon: <ShieldAlert className="h-3 w-3 text-rose-400" /> },
    { text: "Analyze the technical methodology and pipeline.", icon: <Terminal className="h-3 w-3 text-purple-400" /> }
  ];

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl border-zinc-800/80 overflow-hidden">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-zinc-900/10 shrink-0">
        <div className="flex items-center space-x-2.5">
          <MessageSquareDashed className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">AI Context Workspace</h3>
            <span className="text-[10px] text-zinc-500 font-medium">Verify citations and cross-examine uploads</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/20 border border-blue-900/40">
          <Sparkles className="h-3 w-3 text-blue-400" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-400">RAG Secured</span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto p-6">
            <div className="h-12 w-12 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-blue-400 mb-4 shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-200 mb-1.5">Contextual GenAI Assistant</h4>
            <p className="text-xs text-zinc-500 leading-relaxed mb-6">
              Upload documents in the sidebar to build your knowledge registry, then prompt the assistant to interrogate your documents.
            </p>
            
            {/* Quick Action Suggestion Prompts */}
            <div className="w-full space-y-2 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Suggested Starting Queries</span>
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuestion(prompt.text)}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:bg-zinc-900/40 text-xs text-zinc-400 hover:text-zinc-200 transition-all duration-200 cursor-pointer text-left"
                >
                  {prompt.icon}
                  <span className="truncate">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <Message key={index} message={msg} />
          ))
        )}

        {/* Loading / Generating State */}
        {loading && (
          <div className="flex w-full justify-start mb-5">
            <div className="flex items-start gap-3 max-w-[75%]">
              <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 shrink-0">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">System Processing</span>
                <div className="glass-panel text-zinc-100 rounded-2xl rounded-tl-none px-4 py-3 border border-zinc-800/80 shadow-md">
                  <div className="flex items-center space-x-1.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Interrogate your knowledge base... (Press Enter to query)"
            disabled={loading}
            rows={1}
            className="w-full pl-4 pr-12 py-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-100 text-xs sm:text-sm placeholder-zinc-500 resize-none min-h-[46px] max-h-[120px] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="absolute right-3.5 top-2.5 h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-colors shadow-md disabled:shadow-none cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-zinc-600 text-center mt-2.5 font-medium">
          Context queries are parsed semantically against the vector index. Citations are verified using local FAISS indexes.
        </p>
      </div>
    </div>
  );
};

export default Chat;
