import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { User, Sparkles, Clock, Copy, Check } from "lucide-react";
import Sources from "./Sources";

const Message = ({ message }) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>

        {/* Avatar */}
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border shadow-sm mt-5
          ${isUser
            ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
            : "bg-zinc-900 border-zinc-800 text-purple-400"
          }`}
        >
          {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        </div>

        {/* Bubble column */}
        <div className="flex flex-col space-y-0.5 min-w-0">
          {/* Sender label */}
          <div className={`flex items-center gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              {isUser ? "You" : "AI Assistant"}
            </span>
            {!isUser && message.latency_ms > 0 && (
              <span className="text-[8px] text-zinc-600 font-mono flex items-center gap-0.5">
                <Clock className="h-2 w-2" />
                {message.latency_ms.toFixed(0)}ms
              </span>
            )}
          </div>

          {/* Content */}
          <div className={`rounded-2xl px-4 py-3 shadow-sm group relative
            ${isUser
              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none border border-blue-500/30"
              : "glass-panel text-zinc-100 rounded-tl-none border border-zinc-800/80"
            }`}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
            ) : (
              <>
                <div className="markdown-content text-sm leading-relaxed text-zinc-200">
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                </div>

                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 h-6 w-6 rounded-md bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800/80 flex items-center justify-center text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Copy response"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </>
            )}

            {/* Citations */}
            {!isUser && message.sources && message.sources.length > 0 && (
              <Sources sources={message.sources} latency={message.latency_ms} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Message;
