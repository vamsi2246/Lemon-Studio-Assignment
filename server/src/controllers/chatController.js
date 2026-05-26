import { documentStore } from "../data/store.js";
import { askGemini } from "../services/llmService.js";

export const askQuestion = async (req, res) => {
  const { question } = req.body;

  const context = documentStore
    .map((doc) =>
      doc.chunks.map((chunk) => chunk.text).join(" ")
    )
    .join(" ");

  const answer = await askGemini(question, context);

  res.json({
    answer,
  });
};