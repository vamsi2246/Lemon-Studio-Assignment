import { MemoryVectorStore } from "langchain/vectorstores/memory";

let vectorStore = null;

export const createVectorStore = async (
  embeddingsModel,
  documents
) => {
  vectorStore =
    await MemoryVectorStore.fromTexts(
      documents.map((doc) => doc.text),
      documents.map(() => ({})),
      embeddingsModel
    );
};

export const getVectorStore = () => {
  return vectorStore;
};