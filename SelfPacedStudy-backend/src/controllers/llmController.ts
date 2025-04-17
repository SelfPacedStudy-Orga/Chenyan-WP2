import { Request, Response } from "express";
import { generateLLMResponse } from "../services/llmService.js";

const llmController = {
  handleLLMRequest: async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }
      const responseText = await generateLLMResponse(prompt);
      res.json({ response: responseText });
    } catch (error) {
      console.error("LLM request error:", error);
      res.status(500).json({ error: "Failed to generate LLM response" });
    }
  }
};

export default llmController;
