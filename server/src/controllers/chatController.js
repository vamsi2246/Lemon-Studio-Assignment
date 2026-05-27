import { askGemini } from "../services/llmService.js";
import { getVectorStore } from "../services/vectorService.js";

export const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    const vectorStore = getVectorStore();

    if (!vectorStore) {
      return res.status(400).json({
        message: "Upload document first",
      });
    }

    const results =
      await vectorStore.similaritySearch(
        question,
        3
      );

    const context = results
      .map((doc) => doc.pageContent)
      .join(" ");

    const answer = await askGemini(
      question,
      context
    );

    res.json({
      answer,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};