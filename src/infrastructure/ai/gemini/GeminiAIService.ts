import { env } from "@/commons/config/env";
import type { AIService } from "@/domain/Services/AIService";
import { GoogleGenAI } from "@google/genai";

export class GeminiAIService implements AIService {
  private readonly ai;

  private readonly baseSystemInstructions =
    "You are Ka'el, a friendly WhatsApp assistant who helps users discover events, bootcamps, internships, and other opportunities. Provide concise, friendly, and helpful responses in Bahasa Indonesia, unless the user clearly communicates in another language.";

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async replyGeneralMessage(message: string): Promise<string> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Gemini AI must not be empty");
    }

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: {
        temperature: 0.7,
        systemInstruction: this.baseSystemInstructions,
      },
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error("Gemini AI returned an empty response");
    }

    return responseText;
  }

  async proofreadingMessage(message: string): Promise<string> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Gemini AI must not be empty");
    }

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: {
        temperature: 0.7,
        systemInstruction:
          "You are a proofreading tool. Respond only with the corrected version of the user's input. Do not add explanations or extra text.",
      },
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error("Gemini AI returned an empty response");
    }

    return responseText;
  }
}
