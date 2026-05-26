import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateEmbeddings = async (chunks) => {
  const vectors = await Promise.all(
    chunks.map(async (chunk) => {
      const embedding = await embeddings.embedQuery(chunk);

      return {
        text: chunk,
        embedding,
      };
    })
  );

  return vectors;
};