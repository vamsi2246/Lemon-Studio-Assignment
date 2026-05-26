import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const askGemini = async (question, context) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const prompt = `
  Answer the question using the context below.

  Context:
  ${context}

  Question:
  ${question}
  `;

  const result = await model.generateContent(prompt);

  return result.response.text();
};