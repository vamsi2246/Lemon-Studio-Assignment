import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Check } from "lucide-react";

const Sources = ({ sources }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!sources || sources.length === 0) return null;

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Convert decimal to percentage string, e.g. 0.9421 -> 94.2%
  const formatScore = (score) => {
    return `${(score * 100).toFixed(1)}% match`;
  };

  // Color coordinate match score
  const getScoreColor = (score) => {
    if (score >= 0.85) return "text-emerald-400 bg-emerald-950/40 border-emerald-900/50";
    if (score >= 0.70) return "text-amber-400 bg-amber-950/40 border-amber-900/50";
    return "text-zinc-400 bg-zinc-900/40 border-zinc-800";
  };

  return (
    <div className="mt-4 border-t border-zinc-800/80 pt-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Retrieved Grounding Sources ({sources.length})
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {sources.map((source, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <div 
              key={index} 
              className={`rounded-lg border bg-zinc-900/40 transition-all duration-200 
                ${isExpanded ? "border-zinc-700 bg-zinc-900/60" : "border-zinc-850 hover:border-zinc-800"}`}
            >
              {/* Header */}
              <div 
                onClick={() => toggleExpand(index)}
                className="flex items-center justify-between p-3 cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-zinc-300 truncate max-w-[180px] sm:max-w-[280px]">
                      {source.document_name}
                    </span>
                    {source.page && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium shrink-0">
                        Page {source.page}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold tracking-wide ${getScoreColor(source.similarity_score)}`}>
                    {formatScore(source.similarity_score)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-zinc-850/80 pt-2.5">
                  <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap selection:bg-blue-600/40">
                    {source.text}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sources;
