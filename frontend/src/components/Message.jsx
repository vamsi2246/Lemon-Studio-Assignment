import React from "react";
import ReactMarkdown from "react-markdown";
import { User, Cpu } from "lucide-react";
import Sources from "./Sources";

const Message = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-5`}>
      <div className={`flex items-start gap-3 max-w-[85%] sm:max-w-[75%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        
        {/* Avatar */}
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border shadow-md
          ${isUser 
            ? "bg-blue-600/10 border-blue-500/30 text-blue-400" 
            : "bg-zinc-900 border-zinc-800 text-purple-400"
          }`}
        >
          {isUser ? <User className="h-4.5 w-4.5" /> : <Cpu className="h-4.5 w-4.5" />}
        </div>

        {/* Bubble */}
        <div className="flex flex-col space-y-1">
          {/* Sender label */}
          <span className={`text-[10px] font-semibold uppercase tracking-wider text-zinc-500 
            ${isUser ? "text-right" : "text-left"}`}
          >
            {isUser ? "Authorized User" : "Enterprise Search AI"}
          </span>

          {/* Content panel */}
          <div className={`rounded-2xl px-4 py-3 shadow-md
            ${isUser 
              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none border border-blue-500/30" 
              : "glass-panel text-zinc-100 rounded-tl-none"
            }`}
          >
            {isUser ? (
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.text}</p>
            ) : (
              <div className="markdown-content text-sm leading-relaxed text-zinc-200">
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            )}

            {/* Citations / Sources for AI messages */}
            {!isUser && message.sources && message.sources.length > 0 && (
              <Sources sources={message.sources} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Message;
