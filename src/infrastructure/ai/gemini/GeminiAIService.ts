import { env } from "@/commons/config/env";
import { Event } from "@/domain/entities/Event";
import type {
  AIService,
  ChatMessage,
  RelatedUserCandidate,
  SearchableEvent,
  UserContext,
} from "@/domain/Services/AIService";
import { GoogleGenAI } from "@google/genai";
import { parsedEventSchema, type ParsedEventDto } from "../ParsedEventSchema";
import { InvariantError } from "@/commons/exceptions/InvariantError";
import z from "zod";
import { Intent } from "@/domain/entities/Intent";
import { parsedIntentSchema } from "../ParsedIntent";
import { parsedTagsSchema } from "../ParsedTags";
import { parsedSearchQueriesSchema } from "../ParsedSearchQueries";
import { parsedEventSearchResultSchema } from "../ParsedEventSearchResult";
import { parsedRelatedUserIdsSchema } from "../ParsedRelatedUserIds";

export class GeminiAIService implements AIService {
  private readonly ai;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async replyGeneralMessage(
    message: string,
    history: ChatMessage[],
    user?: UserContext,
  ): Promise<string> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Gemini AI must not be empty");
    }

    const historyText = this.formatHistory(history);
    const userContext = this.formatUserContext(user);
    const finalPrompt = [userContext, historyText, `Pesan pengguna: ${prompt}`]
      .filter(Boolean)
      .join("\n\n");

    const systemInstruction = [
      "You are Ka'el, a friendly WhatsApp assistant who helps users discover events, bootcamps, internships, and other opportunities. Provide concise, friendly, and helpful responses in Bahasa Indonesia, unless the user clearly communicates in another language.",
      "You can engage in light small talk, but gently steer the conversation toward helping the user find or manage events/opportunities.",
      "If you don't know the answer, respond with apologies and say you can't help.",
      "Keep your responses brief and to the point. Avoid very long essays.",
      "REFERENCE: kael have following function tag: @register <name>, @profile <description>. Suggest user to resend message with those tag if relevant or if you think user intended to use function tag but typo.",
    ].join("\n");

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: finalPrompt,
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
        systemInstruction: [
          "You are a data extractor tool. Extract data to the given schema and respond ONLY with JSON.",
          "Classify intent using these Bahasa-first rules:",
          '- intent = "search_event" if the user wants to mencari/cari/search/find/lihat/rekomendasi event/lomba/bootcamp/magang/beasiswa/pendanaan/opportunity. Contoh: "ada event data science?", "cari lomba UI/UX", "butuh rekomendasi magang backend".',
          '- intent = "add_event" if the user is menyampaikan/mendaftarkan/mempublikasikan event atau memberikan detail event (judul, tanggal, harga, penyelenggara, link, deskripsi, lokasi, benefit). Anggap add_event meskipun detail belum lengkap.',
          '- intent = "general" untuk sapaan, small talk, pertanyaan tentang bot, atau topik di luar pencarian/penambahan event.',
          "Set `value` ke bagian permintaan yang relevan: untuk search gunakan teks query ringkas; untuk add_event ringkas isi event yang disebut; untuk general isi ringkasan niat user.",
          "Jangan pernah kembalikan intent di luar schema.",
        ].join("\n"),
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

  async findRelatedUserIdsForEvent(event: Event, users: RelatedUserCandidate[]): Promise<string[]> {
    if (!users.length) return [];

    const condensedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      profile: this.truncate(user.profile) ?? "",
    }));

    const condensedEvent = {
      title: event.title,
      description: this.truncate(event.description),
      organizer: event.organizer,
      tags: event.tags.map((tag) => tag.name),
    };

    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        "Pilih user yang paling relevan untuk menerima informasi tentang event baru ini.",
        "Pilih maksimal 10 user. Kembalikan array kosong jika tidak ada yang cocok.",
        `Detail event:\n${JSON.stringify(condensedEvent, null, 2)}`,
        `Daftar user (id, nama, profil):\n${JSON.stringify(condensedUsers, null, 2)}`,
      ].join("\n\n"),
      config: {
        systemInstruction:
          "Kamu adalah sistem rekomendasi notifikasi event. Pilih ID user dari daftar yang paling sesuai dengan tema, penyelenggara, dan deskripsi event. Jangan pernah menambah ID baru atau data lain. Jawab hanya dengan JSON valid sesuai schema.",
        responseMimeType: "application/json",
        responseSchema: z.toJSONSchema(parsedRelatedUserIdsSchema),
      },
    });

    const parsed = parsedRelatedUserIdsSchema.parse(JSON.parse(result.text as string));
    return parsed.userIds;
  }

  async findMatchingEventIds(
    query: string,
    events: SearchableEvent[],
    history: ChatMessage[],
    user?: UserContext,
  ): Promise<number[]> {
    const prompt = query.trim();
    if (!prompt) {
      throw new Error("Search query for Gemini AI must not be empty");
    }
    if (events.length === 0) {
      return [];
    }

    const condensedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: this.truncate(event.description),
      organizer: event.organizer,
      startDate: event.startDate.toISOString().split("T")[0],
      endDate: event.endDate.toISOString().split("T")[0],
      tags: event.tags,
      priceRange: `${event.priceMin}-${event.priceMax}`,
    }));

    const historyText = this.formatHistory(history);
    const userContext = this.formatUserContext(user);
    const result = await this.ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [
        "Tentukan event yang paling relevan dengan permintaan pengguna berdasarkan daftar event berikut.",
        userContext ? `Profil pengguna (non-sensitif):\n${userContext}` : "",
        historyText ? `Riwayat percakapan:\n${historyText}` : "",
        `Query pengguna: ${prompt}`,
        "Urutkan ID event dari yang paling relevan. Maksimal rekomendasikan 3 event. Jika tidak ada yang cocok, kembalikan array kosong.",
        `Daftar event:\n${JSON.stringify(condensedEvents, null, 2)}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      config: {
        systemInstruction:
          "Kamu adalah asisten pencarian event. Pilih ID event yang paling sesuai dengan query pengguna hanya dari daftar yang diberikan. Pertimbangkan judul, deskripsi, penyelenggara, tanggal, dan tags. Balas dalam format JSON sesuai schema. Jika tidak ada yang relevan, kembalikan array kosong.",
        responseMimeType: "application/json",
        responseSchema: z.toJSONSchema(parsedEventSearchResultSchema),
      },
    });

    const parsed = parsedEventSearchResultSchema.parse(JSON.parse(result.text as string));
    return parsed.eventIds;
  }

  private truncate(text: string | null, maxLength = 300): string | null {
    if (!text) return null;
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  }

  private formatHistory(history: ChatMessage[], limit = 50): string {
    if (!history.length) return "";
    const recent = history.slice(-limit);
    return recent
      .map((msg) => {
        const role = msg.role.toUpperCase();
        return `${role}: ${msg.content}`;
      })
      .join("\n");
  }

  private formatUserContext(user?: UserContext): string {
    if (!user) return "";
    const profile = user.profile ? user.profile.trim() : "";
    return [`Nama: ${user.name}`, profile ? `Profil: ${profile}` : ""].filter(Boolean).join("\n");
  }
}
