import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import API from "../services/api";

const Upload = ({ onUploadSuccess }) => {
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, indexing, success, error
  const [statusMessage, setStatusMessage] = useState("");

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    // We process each accepted file sequentially to show detailed feedback for each
    setUploadStatus("uploading");
    setStatusMessage(`Uploading ${acceptedFiles.length} document(s)...`);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        setUploadStatus("indexing");
        setStatusMessage(`Parsing and indexing '${file.name}'...`);

        const res = await API.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        // Trigger parent state update
        if (onUploadSuccess) {
          onUploadSuccess(res.data);
        }
      } catch (error) {
        console.error("Upload error:", error);
        setUploadStatus("error");
        setStatusMessage(
          error.response?.data?.detail || `Failed to index '${file.name}'.`
        );
        return; // Halt queue on error
      }
    }

    setUploadStatus("success");
    setStatusMessage("All files indexed successfully!");
    
    // Reset to idle after 3 seconds
    setTimeout(() => {
      setUploadStatus("idle");
      setStatusMessage("");
    }, 3000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 
          ${isDragActive 
            ? "border-blue-500 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/30"
          } 
          ${uploadStatus === "uploading" || uploadStatus === "indexing" ? "pointer-events-none opacity-80" : ""}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-3">
          {uploadStatus === "uploading" || uploadStatus === "indexing" ? (
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          ) : uploadStatus === "success" ? (
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          ) : uploadStatus === "error" ? (
            <AlertCircle className="h-10 w-10 text-rose-500" />
          ) : (
            <UploadCloud className={`h-10 w-10 transition-colors ${isDragActive ? "text-blue-500" : "text-zinc-500"}`} />
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-200">
              {uploadStatus === "uploading" || uploadStatus === "indexing"
                ? "Processing document..."
                : isDragActive
                ? "Drop the PDFs here"
                : "Drag & Drop PDFs here"}
            </p>
            <p className="text-xs text-zinc-500">
              Supports multiple files (PDF only, up to 10MB)
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div 
          className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 border transition-all duration-300
            ${uploadStatus === "success" 
              ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400" 
              : uploadStatus === "error" 
              ? "bg-rose-950/30 border-rose-900/50 text-rose-400"
              : "bg-blue-950/30 border-blue-900/50 text-blue-400"
            }`}
        >
          {(uploadStatus === "uploading" || uploadStatus === "indexing") && (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Upload;
