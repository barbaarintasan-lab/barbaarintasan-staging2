import type { Express, Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      console.log("[DALL-E] Generating image with prompt:", prompt.slice(0, 100) + "...");

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1792x1024",
        response_format: "b64_json",
        quality: "standard",
      });

      if (response.data && response.data.length > 0 && response.data[0].b64_json) {
        const imageBase64 = response.data[0].b64_json;
        console.log("[DALL-E] Image generated successfully");
        res.json({
          b64_json: imageBase64,
          url: `data:image/png;base64,${imageBase64}`,
        });
      } else {
        console.error("[DALL-E] No image in response");
        res.status(500).json({ error: "No image generated" });
      }
    } catch (error: any) {
      console.error("[DALL-E] Error generating image:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to generate image" });
    }
  });
}
