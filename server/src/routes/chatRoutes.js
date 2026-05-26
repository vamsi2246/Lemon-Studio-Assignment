import { Router } from "express";
import { askQuestion } from "../controllers/chatController.js";

const router = Router();

router.post("/", askQuestion);

export default router;