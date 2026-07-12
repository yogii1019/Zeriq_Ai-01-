import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback: also load .env if present, without overriding already-set vars

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined in Secrets or .env file.");
    }
    // Note: If apiKey is undefined, the SDK might still try to read from PROCESS.ENV.GEMINI_API_KEY internally,
    // but initializing with process.env.GEMINI_API_KEY provides optimal clarity and structure.
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FOR_DEV",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}
