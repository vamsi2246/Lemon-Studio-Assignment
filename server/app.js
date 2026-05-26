import express from "express";
import cors from "cors";

import uploadRoutes from "./routes/uploadRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/upload", uploadRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.send("API running...");
});

export default app;