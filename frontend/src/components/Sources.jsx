import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp, ExternalLink, Percent, ShieldCheck } from "lucide-react";

const Sources = ({ sources, latency }) => {
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [expandedChunk, setExpandedChunk] = useState({});

  if (!sources || sources.length === 0) return null;

  // Group retrieved chunks by document name
  const groupedSources = {};
  sources.forEach((source, index) => {
    const docName = source.document_name || "Unknown Document";
    if (!groupedSources[docName]) {
      groupedSources[docName] = [];
    }
    groupedSources[docName].push({ ...source, globalIndex: index });
  });

  const docNames = Object.keys(groupedSources);

  // Toggle document expansion
  const toggleDoc = (docName) => {
    setExpandedDoc(expandedDoc === docName ? null : docName);
  };

  // Toggle individual chunk text expansion
  const toggleChunk = (globalIndex) => {
    setExpandedChunk(prev => ({
      ...prev,
      [globalIndex]: !prev[globalIndex]
    }));
  };

  // Score styling coordinator
  const getScoreBadge = (score) => {
    const pct = (score * 100).toFixed(0);
    if (score >= 0.85) {
      return {
        text: `${pct}% Match`,
        style: "text-emerald-400 bg-emerald-950/30 border-emerald-900/40"
      };
    }
    if (score >= 0.70) {
      return {
        text: `${pct}% Match`,
        style: "text-amber-400 bg-amber-950/30 border-amber-900/40"
      };
    }
    return {
      text: `${pct}% Match`,
      style: "text-zinc-450 bg-zinc-900/40 border-zinc-800"
    };
  };

  return (
    <div className="mt-4 border-t border-zinc-900/80 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-500/80" />
          Retrieved Grounding Context ({sources.length} chunks)
        </span>
        {latency !== undefined && latency > 0 && (
          <span className="text-[9px] text-zinc-600 font-mono">
            Search time: {latency.toFixed(0)}ms
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {docNames.map((docName) => {
          const docChunks = groupedSources[docName];
          const isDocExpanded = expandedDoc === docName;
          
          // Calculate average similarity score for the document
          const avgScore = docChunks.reduce((sum, c) => sum + (c.similarity_score || 0), 0) / docChunks.length;
          const badge = getScoreBadge(avgScore);

          return (
            <div
              key={docName}
              className={`rounded-xl border transition-all duration-200 bg-zinc-950/10
                ${isDocExpanded ? "border-zinc-800 bg-zinc-950/20" : "border-zinc-900/80 hover:border-zinc-800"}`}
            >
              {/* Document Header Toggle */}
              <div
                onClick={() => toggleDoc(docName)}
                className="flex items-center justify-between p-2.5 cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-350 truncate max-w-[200px] sm:max-w-[280px]">
                    {docName}
                  </span>
                  <span className="text-[9px] text-zinc-650 px-1.5 py-0.5 rounded bg-zinc-900/60 font-mono">
                    {docChunks.length} {docChunks.length === 1 ? "ref" : "refs"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${badge.style}`}>
                    {badge.text}
                  </span>
                  {isDocExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-zinc-550" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-550" />
                  )}
                </div>
              </div>

              {/* Nested Chunks List */}
              {isDocExpanded && (
                <div className="px-2.5 pb-2.5 border-t border-zinc-900/60 pt-2 space-y-2 bg-zinc-950/10">
                  {docChunks.map((chunk) => {
                    const isChunkExpanded = expandedChunk[chunk.globalIndex];
                    const chunkBadge = getScoreBadge(chunk.similarity_score);
                    
                    return (
                      <div
                        key={chunk.globalIndex}
                        className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-900/60 text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {chunk.page && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-semibold">
                                Page {chunk.page}
                              </span>
                            )}
                            <span className="text-[8px] text-zinc-600 font-mono">
                              Chunk #{chunk.globalIndex + 1}
                            </span>
                          </div>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold ${chunkBadge.style}`}>
                            {chunkBadge.text}
                          </span>
                        </div>

                        {/* Text Snippet Preview */}
                        <div className="relative">
                          <p
                            onClick={() => toggleChunk(chunk.globalIndex)}
                            className={`text-xs text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap cursor-pointer selection:bg-blue-600/30 hover:text-zinc-350 transition-colors
                              ${isChunkExpanded ? "" : "line-clamp-3"}`}
                          >
                            {chunk.text}
                          </p>
                          
                          {/* Toggle Expand Trigger */}
                          <div className="flex justify-end mt-1">
                            <button
                              onClick={() => toggleChunk(chunk.globalIndex)}
                              className="text-[9px] text-zinc-650 hover:text-blue-400 font-bold transition-colors cursor-pointer"
                            >
                              {isChunkExpanded ? "Show less" : "Read chunk content"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
