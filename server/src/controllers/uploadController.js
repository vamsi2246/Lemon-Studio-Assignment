import { extractPdfText } from "../services/pdfService.js";
import { chunkText } from "../utils/textChunker.js";
import { generateEmbeddings } from "../services/embeddingService.js";
import { documentStore } from "../data/store.js";

export const uploadFile = async (req, res) => {
  const text = await extractPdfText(req.file.path);

  const chunks = chunkText(text);

  const embeddings = await generateEmbeddings(chunks);

  documentStore.push({
    fileName: req.file.originalname,
    chunks: embeddings,
  });

  res.json({
    message: "Document processed successfully",
    totalChunks: chunks.length,
  });
};