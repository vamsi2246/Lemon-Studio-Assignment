import { Router } from "express";
import { uploadFile } from "../controllers/uploadController.js";
import upload from "../middlewares/uploadMiddleware.js"

const router = Router();

router.post("/", upload.single("file"), uploadFile);

export default router;