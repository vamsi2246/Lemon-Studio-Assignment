import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import API from "../services/api";

const Upload = ({ onUploadSuccess }) => {
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, indexing, success, error
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    // Check size limit: 100MB minimum
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    for (let file of acceptedFiles) {
      if (file.size > MAX_SIZE) {
        setUploadStatus("error");
        setStatusMessage(`"${file.name}" exceeds the 100MB limit.`);
        return;
      }
    }

    setUploadStatus("uploading");
    setProgress(0);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        setUploadStatus("indexing");
        setStatusMessage(`Ingesting "${file.name}" (Page parsing & FAISS indexing)…`);
        setProgress(((i) / acceptedFiles.length) * 100);

        // Perform upload with extended timeout for large PDFs
        await API.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 180000, // 3 minutes timeout for extremely large documents
          onUploadProgress: (progressEvent) => {
            const fileProgress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            // Weigh current file upload into total progress
            const totalProgress = ((i + fileProgress / 100) / acceptedFiles.length) * 100;
            setProgress(Math.round(totalProgress));
          }
        });

        setProgress(((i + 1) / acceptedFiles.length) * 100);
        if (onUploadSuccess) onUploadSuccess();
      } catch (error) {
        console.error("Ingestion error:", error);
        setUploadStatus("error");
        // Avoid showing raw python tracebacks, present a refined user message
        const errMsg = error.response?.data?.detail || `Failed to process "${file.name}". Ensure it is a valid, readable PDF.`;
        setStatusMessage(errMsg);
        return;
      }
    }

    setUploadStatus("success");
    setStatusMessage(`Indexed ${acceptedFiles.length} document(s) successfully!`);
    setTimeout(() => {
      setUploadStatus("idle");
      setStatusMessage("");
      setProgress(0);
    }, 3000);
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
        className={`relative border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 overflow-hidden
          ${isDragActive
            ? "border-blue-500 bg-blue-950/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
          }
          ${isProcessing ? "pointer-events-none opacity-85" : ""}`}
      >
        <input {...getInputProps()} />

        {/* Progress bar overlay indicator */}
        {isProcessing && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-900">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex flex-col items-center justify-center space-y-2">
          {isProcessing ? (
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          ) : uploadStatus === "success" ? (
            <CheckCircle className="h-6 w-6 text-emerald-500" />
          ) : uploadStatus === "error" ? (
            <AlertCircle className="h-6 w-6 text-rose-500" />
          ) : (
            <UploadCloud className={`h-6 w-6 transition-colors ${isDragActive ? "text-blue-500" : "text-zinc-500"}`} />
          )}

          <div>
            <p className="text-[11px] font-medium text-zinc-300">
              {isProcessing
                ? `Processing… (${progress}%)`
                : isDragActive
                ? "Drop the files here"
                : "Drop files or browse"}
            </p>
            {!isProcessing && (
              <p className="text-[9px] text-zinc-650 mt-0.5">PDF Registry · Max 100MB</p>
            )}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-2 rounded-lg text-[10px] flex items-center gap-1.5 border transition-all leading-normal
            ${uploadStatus === "success"
              ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400"
              : uploadStatus === "error"
              ? "bg-rose-950/30 border-rose-900/50 text-rose-400"
              : "bg-blue-950/30 border-blue-900/50 text-blue-400"
            }`}
        >
          {isProcessing && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
          <span className="truncate flex-1">{statusMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Upload;
