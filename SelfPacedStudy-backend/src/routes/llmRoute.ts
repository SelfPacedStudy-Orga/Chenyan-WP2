import express from "express";
import llmController from "../controllers/llmController.js";

const router = express.Router();

// POST /llm for offline LLM response generation
router.post("/", llmController.handleLLMRequest);

export default router;
