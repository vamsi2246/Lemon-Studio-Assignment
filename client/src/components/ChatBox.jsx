import { useState } from "react";
import API from "../services/api";

const ChatBox = () => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    try {
      if (!question) return;

      setLoading(true);

      const userMessage = {
        role: "user",
        text: question,
      };

      const res = await API.post("/chat", {
        question,
      });

      const aiMessage = {
        role: "ai",
        text: res.data.answer,
      };

      setMessages((prev) => [
        ...prev,
        userMessage,
        aiMessage,
      ]);

      setSources(res.data.sources || []);

      setQuestion("");

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl h-full">

      <h2 className="text-2xl font-bold mb-4">
        Ask AI
      </h2>

      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl ${
              msg.role === "user"
                ? "bg-blue-600"
                : "bg-zinc-800"
            }`}
          >
            <p>{msg.text}</p>
          </div>
        ))}

      </div>

      <textarea
        value={question}
        onChange={(e) =>
          setQuestion(e.target.value)
        }
        placeholder="Ask question..."
        className="w-full p-3 rounded-lg bg-zinc-800 outline-none mb-4 min-h-[120px]"
      />

      <button
        onClick={handleAsk}
        className="bg-green-600 px-4 py-2 rounded-lg"
      >
        {loading ? "Thinking..." : "Ask"}
      </button>

      {sources.length > 0 && (
        <div className="mt-6">

          <h3 className="font-bold mb-2">
            Retrieved Chunks
          </h3>

          {sources.map((source, index) => (
            <div
              key={index}
              className="bg-zinc-800 p-3 rounded-lg mb-2 text-sm text-zinc-300"
            >
              {source}
            </div>
          ))}

        </div>
      )}

    </div>
  );
};

export default ChatBox;