import { env } from "@/commons/config/env";
import { Event } from "@/domain/entities/Event";
import type { AIService } from "@/domain/Services/AIService";
import { GoogleGenAI } from "@google/genai";
import { parsedEventSchema, type ParsedEventDto } from "../ParsedEventSchema";
import { InvariantError } from "@/commons/exceptions/InvariantError";
import z from "zod";
import { Intent } from "@/domain/entities/Intent";
import { parsedIntentSchema } from "../ParsedIntent";
import { parsedTagsSchema } from "../ParsedTags";
import { parsedSearchQueriesSchema } from "../ParsedSearchQueries";

export class GeminiAIService implements AIService {
  private readonly ai;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async replyGeneralMessage(message: string): Promise<string> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Gemini AI must not be empty");
    }

    const systemInstruction = [
      "You are Ka'el, a friendly WhatsApp assistant who helps users discover events, bootcamps, internships, and other opportunities. Provide concise, friendly, and helpful responses in Bahasa Indonesia, unless the user clearly communicates in another language.",
      "If you don't know the answer, respond with apologies and say you can't help.",
      "Keep your responses brief and to the point.",
      "IMPORTANT: only provide information related to events, bootcamps, internships, and opportunities. Do not answer questions outside of these topics.",
      "REFERENCE: kael have following function tag: @register <name>, @profile <description>. Suggest user to resend message with those tag if relevant or if you think user intended to use function tag but typo.",
    ].join("\n");

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        systemInstruction,
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
      contents: prompt,
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

  async parseEvent(message: string): Promise<Event> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Gemini AI must not be empty");
    }

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a data extractor tool. Extract the raw data to given schema. Only respond with json.",
        responseMimeType: "application/json",
        responseSchema: z.toJSONSchema(parsedEventSchema),
      },
    });

    const parsed = parsedEventSchema.parse(JSON.parse(result.text as string));
    return this.toDomainEvent(parsed);
  }

  private toDomainEvent(parsed: ParsedEventDto): Event {
    const organizer = this.requireField(parsed.organizer, "organizer");

    const startDate = this.parseDate(parsed.startDate, "startDate");
    const endDate = this.parseDate(parsed.endDate, "endDate");

    return Event.createNew({
      title: parsed.title,
      slug: parsed.slug ?? this.slugify(parsed.title),
      description: parsed.description ?? null,
      organizer,
      startDate,
      endDate,
      url: parsed.url ?? null,
      priceMin: parsed.priceMin,
      priceMax: parsed.priceMax,
      hasCertificate: parsed.hasCertificate ?? false,
      raw: parsed.raw ?? null,
      tags: parsed.tags ?? [],
    });
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new InvariantError(`Gemini AI returned invalid ${field}: ${value}`);
    }
    return date;
  }

  private requireField<T>(value: T | null | undefined, field: string): T {
    if (value === null || value === undefined) {
      throw new InvariantError(`Gemini AI response is missing required field: ${field}`);
    }
    return value;
  }

  private slugify(text: string): string {
    const slug = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || `event-${Date.now()}`;
  }

  async parseIntent(message: string): Promise<Intent> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Gemini AI must not be empty");
    }

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a data extractor tool. Extract the raw data to given schema. Only respond with json. Make sure to identify user intent accurately based on the message content. Distinguish between service intent and event intent. If the message indicates a request to register, update profile, or inquire about user-specific information, classify it as a service intent and user 'general' intent. If the message discusses events, bootcamps, internships, or opportunities, classify it as an event intent.",
        responseMimeType: "application/json",
        responseSchema: z.toJSONSchema(parsedIntentSchema),
      },
    });

    const parsed = parsedIntentSchema.parse(JSON.parse(result.text as string));
    return new Intent(parsed);
  }

  async parseTags(message: string): Promise<string[]> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Gemini AI must not be empty");
    }

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a data extractor tool. Extract the raw data to given schema. Only respond with json.",
        responseMimeType: "application/json",
        responseSchema: z.toJSONSchema(parsedTagsSchema),
      },
    });

    const parsed = parsedTagsSchema.parse(JSON.parse(result.text as string));
    return parsed.tags;
  }

  async parseSearchQuery(message: string): Promise<string[]> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Gemini AI must not be empty");
    }

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a data extractor tool. Extract the raw data to given schema. Only respond with json.",
        responseMimeType: "application/json",
        responseSchema: z.toJSONSchema(parsedSearchQueriesSchema),
      },
    });

    const parsed = parsedSearchQueriesSchema.parse(JSON.parse(result.text as string));
    return parsed.queries;
  }
}
