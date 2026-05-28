import React, { useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle, AlertCircle, Loader2, File } from "lucide-react";
import API from "../services/api";

const Upload = ({ onUploadSuccess }) => {
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploadStatus("uploading");
    setProgress(0);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        setStatusMessage(`Indexing "${file.name}"…`);
        setProgress(((i) / acceptedFiles.length) * 100);
        setUploadStatus("indexing");

        await API.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setProgress(((i + 1) / acceptedFiles.length) * 100);

        if (onUploadSuccess) onUploadSuccess();
      } catch (error) {
        console.error("Upload error:", error);
        setUploadStatus("error");
        setStatusMessage(error.response?.data?.detail || `Failed to index "${file.name}".`);
        return;
      }
    }

    setUploadStatus("success");
    setStatusMessage(`${acceptedFiles.length} file(s) indexed!`);
    setTimeout(() => {
      setUploadStatus("idle");
      setStatusMessage("");
      setProgress(0);
    }, 2500);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    disabled: uploadStatus === "uploading" || uploadStatus === "indexing",
  });

  const isProcessing = uploadStatus === "uploading" || uploadStatus === "indexing";

  return (
    <div className="w-full space-y-2">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 overflow-hidden
          ${isDragActive
            ? "border-blue-500 bg-blue-950/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
          }
          ${isProcessing ? "pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />

        {/* Progress bar overlay */}
        {isProcessing && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-zinc-900">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex flex-col items-center justify-center space-y-2">
          {isProcessing ? (
            <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
          ) : uploadStatus === "success" ? (
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          ) : uploadStatus === "error" ? (
            <AlertCircle className="h-7 w-7 text-rose-500" />
          ) : (
            <UploadCloud className={`h-7 w-7 transition-colors ${isDragActive ? "text-blue-500" : "text-zinc-500"}`} />
          )}

          <div>
            <p className="text-[11px] font-medium text-zinc-300">
              {isProcessing ? "Processing…" : isDragActive ? "Drop PDFs here" : "Drop or click to upload"}
            </p>
            {!isProcessing && (
              <p className="text-[9px] text-zinc-600 mt-0.5">PDF · Max 10MB</p>
            )}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-2 rounded-lg text-[10px] flex items-center gap-1.5 border transition-all
            ${uploadStatus === "success"
              ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400"
              : uploadStatus === "error"
              ? "bg-rose-950/30 border-rose-900/50 text-rose-400"
              : "bg-blue-950/30 border-blue-900/50 text-blue-400"
            }`}
        >
          {isProcessing && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
          <span className="truncate">{statusMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Upload;
