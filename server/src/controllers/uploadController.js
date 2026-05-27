import { extractPdfText } from "../services/pdfService.js";
import { chunkText } from "../utils/textChunker.js";
import { generateEmbeddings } from "../services/embeddingService.js";

import { documentStore } from "../data/store.js";

import { createVectorStore } from "../services/vectorService.js";

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export const uploadFile = async (req, res) => {
  const text = await extractPdfText(req.file.path);

  const chunks = chunkText(text);

  const embeddings = await generateEmbeddings(chunks);

  documentStore.push({
    fileName: req.file.originalname,
    chunks: embeddings,
  });

  const embeddingsModel =
    new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
    });

  await createVectorStore(
    embeddingsModel,
    embeddings
  );

  res.json({
    message: "Document processed successfully",
  });
};