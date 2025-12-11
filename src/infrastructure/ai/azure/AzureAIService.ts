import { env } from "@/commons/config/env";
import { InvariantError } from "@/commons/exceptions/InvariantError";
import { Event } from "@/domain/entities/Event";
import { Intent } from "@/domain/entities/Intent";
import type {
  AIService,
  ChatMessage,
  RelatedUserCandidate,
  SearchableEvent,
  UserContext,
} from "@/domain/Services/AIService";
import OpenAI from "openai";
import z from "zod";
import { parsedEventSchema, type ParsedEventDto } from "../ParsedEventSchema";
import { parsedIntentSchema } from "../ParsedIntent";
import { parsedTagsSchema } from "../ParsedTags";
import { parsedSearchQueriesSchema } from "../ParsedSearchQueries";
import { parsedEventSearchResultSchema } from "../ParsedEventSearchResult";
import { parsedRelatedUserIdsSchema } from "../ParsedRelatedUserIds";

type ChatMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ResponseFormat =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming["response_format"];

export class AzureAIService implements AIService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    this.ensureAzureConfig();

    const deploymentName = env.AZURE_OPENAI_MODEL || env.AZURE_OPENAI_DEPLOYMENT;

    const baseURL = env.AZURE_OPENAI_ENDPOINT.replace(/\/+$/, "");
    const defaultQuery = env.AZURE_OPENAI_API_VERSION
      ? { "api-version": env.AZURE_OPENAI_API_VERSION }
      : undefined;
    this.client = new OpenAI({
      apiKey: env.AZURE_OPENAI_API_KEY,
      baseURL,
      defaultHeaders: { "api-key": env.AZURE_OPENAI_API_KEY },
      defaultQuery,
    });
    this.model = deploymentName;
  }

  async replyGeneralMessage(
    message: string,
    history: ChatMessage[],
    user?: UserContext,
  ): Promise<string> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Azure OpenAI must not be empty");
    }

    const systemInstruction = [
      "You are Ka'el, a friendly WhatsApp assistant who helps users discover events, bootcamps, internships, and other opportunities. Provide concise, friendly, and helpful responses in Bahasa Indonesia, unless the user clearly communicates in another language.",
      "You can engage in light small talk, but gently steer the conversation toward helping the user find or manage events/opportunities.",
      "If you don't know the answer, respond with apologies and say you can't help.",
      "Keep your responses brief and to the point. Avoid very long essays.",
      "REFERENCE: kael have following function tag: @register <name>, @profile <description>. Suggest user to resend message with those tag if relevant or if you think user intended to use function tag but typo.",
    ].join("\n");

    const messages: ChatMessageParam[] = [
      { role: "system", content: systemInstruction },
      ...this.toChatHistory(history),
    ];

    const userContext = this.formatUserContext(user);
    if (userContext) {
      messages.push({ role: "system", content: `Profil pengguna (non-sensitif):\n${userContext}` });
    }

    messages.push({ role: "user", content: prompt });

    return this.complete(messages, 0.7);
  }

  async proofreadingMessage(message: string): Promise<string> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Azure OpenAI must not be empty");
    }

    const messages: ChatMessageParam[] = [
      {
        role: "system",
        content:
          "You are a proofreading tool. Respond only with the corrected version of the user's input. Do not add explanations or extra text.",
      },
      { role: "user", content: prompt },
    ];

    return this.complete(messages, 0.7);
  }

  async parseEvent(message: string): Promise<Event> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Azure OpenAI must not be empty");
    }

    const messages: ChatMessageParam[] = [
      {
        role: "system",
        content:
          "You are a data extractor tool. Extract the raw data to given schema. Only respond with json.",
      },
      { role: "user", content: prompt },
    ];

    const responseText = await this.complete(
      messages,
      0,
      this.getJsonSchemaResponseFormat(z.toJSONSchema(parsedEventSchema), "parse_event"),
    );
    const parsed = parsedEventSchema.parse(JSON.parse(responseText));
    return this.toDomainEvent(parsed);
  }

  async parseIntent(message: string): Promise<Intent> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Azure OpenAI must not be empty");
    }

    const messages: ChatMessageParam[] = [
      {
        role: "system",
        content: [
          "You are a data extractor tool. Extract data to the given schema and respond ONLY with JSON.",
          "Classify intent using these Bahasa-first rules:",
          '- intent = "search_event" if the user wants to mencari/cari/search/find/lihat/rekomendasi event/lomba/bootcamp/magang/beasiswa/pendanaan/opportunity. Contoh: "ada event data science?", "cari lomba UI/UX", "butuh rekomendasi magang backend".',
          '- intent = "add_event" if the user is menyampaikan/mendaftarkan/mempublikasikan event atau memberikan detail event (judul, tanggal, harga, penyelenggara, link, deskripsi, lokasi, benefit). Anggap add_event meskipun detail belum lengkap.',
          '- intent = "general" untuk sapaan, small talk, pertanyaan tentang bot, atau topik di luar pencarian/penambahan event.',
          "Set `value` ke bagian permintaan yang relevan: untuk search gunakan teks query ringkas; untuk add_event ringkas isi event yang disebut; untuk general isi ringkasan niat user.",
          "Jangan pernah kembalikan intent di luar schema.",
        ].join("\n"),
      },
      { role: "user", content: prompt },
    ];

    const responseText = await this.complete(
      messages,
      0,
      this.getJsonSchemaResponseFormat(z.toJSONSchema(parsedIntentSchema), "parse_intent"),
    );
    const parsed = parsedIntentSchema.parse(JSON.parse(responseText));
    return new Intent(parsed);
  }

  async parseTags(message: string): Promise<string[]> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Azure OpenAI must not be empty");
    }

    const messages: ChatMessageParam[] = [
      {
        role: "system",
        content:
          "You are a data extractor tool. Extract the raw data to given schema. Only respond with json.",
      },
      { role: "user", content: prompt },
    ];

    const responseText = await this.complete(
      messages,
      0,
      this.getJsonSchemaResponseFormat(z.toJSONSchema(parsedTagsSchema), "parse_tags"),
    );
    const parsed = parsedTagsSchema.parse(JSON.parse(responseText));
    return parsed.tags;
  }

  async parseSearchQuery(message: string): Promise<string[]> {
    const prompt = message.trim();
    if (!prompt) {
      throw new Error("Message for Azure OpenAI must not be empty");
    }

    const messages: ChatMessageParam[] = [
      {
        role: "system",
        content:
          "You are a data extractor tool. Extract the raw data to given schema. Only respond with json.",
      },
      { role: "user", content: prompt },
    ];

    const responseText = await this.complete(
      messages,
      0,
      this.getJsonSchemaResponseFormat(z.toJSONSchema(parsedSearchQueriesSchema), "parse_search"),
    );
    const parsed = parsedSearchQueriesSchema.parse(JSON.parse(responseText));
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

    const userPrompt = [
      "Pilih user yang paling relevan untuk menerima informasi tentang event baru ini.",
      "Pilih maksimal 10 user. Kembalikan array kosong jika tidak ada yang cocok.",
      `Detail event:\n${JSON.stringify(condensedEvent, null, 2)}`,
      `Daftar user (id, nama, profil):\n${JSON.stringify(condensedUsers, null, 2)}`,
    ].join("\n\n");

    const messages: ChatMessageParam[] = [
      {
        role: "system",
        content:
          "Kamu adalah sistem rekomendasi notifikasi event. Pilih ID user dari daftar yang paling sesuai dengan tema, penyelenggara, dan deskripsi event. Jangan pernah menambah ID baru atau data lain. Jawab hanya dengan JSON valid sesuai schema.",
      },
      { role: "user", content: userPrompt },
    ];

    const responseText = await this.complete(
      messages,
      0,
      this.getJsonSchemaResponseFormat(z.toJSONSchema(parsedRelatedUserIdsSchema), "related_users"),
    );
    const parsed = parsedRelatedUserIdsSchema.parse(JSON.parse(responseText));
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
      throw new Error("Search query for Azure OpenAI must not be empty");
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

    const userPrompt = [
      "Tentukan event yang paling relevan dengan permintaan pengguna berdasarkan daftar event berikut.",
      userContext ? `Profil pengguna (non-sensitif):\n${userContext}` : "",
      historyText ? `Riwayat percakapan:\n${historyText}` : "",
      `Query pengguna: ${prompt}`,
      "Urutkan ID event dari yang paling relevan. Maksimal rekomendasikan 3 event. Jika tidak ada yang cocok, kembalikan array kosong.",
      `Daftar event:\n${JSON.stringify(condensedEvents, null, 2)}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages: ChatMessageParam[] = [
      {
        role: "system",
        content:
          "Kamu adalah asisten pencarian event. Pilih ID event yang paling sesuai dengan query pengguna hanya dari daftar yang diberikan. Pertimbangkan judul, deskripsi, penyelenggara, tanggal, dan tags. Balas dalam format JSON sesuai schema. Jika tidak ada yang relevan, kembalikan array kosong.",
      },
      { role: "user", content: userPrompt },
    ];

    const responseText = await this.complete(
      messages,
      0,
      this.getJsonSchemaResponseFormat(
        z.toJSONSchema(parsedEventSearchResultSchema),
        "search_events",
      ),
    );
    const parsed = parsedEventSearchResultSchema.parse(JSON.parse(responseText));
    return parsed.eventIds;
  }

  private async complete(
    messages: ChatMessageParam[],
    temperature: number,
    responseFormat?: ResponseFormat,
  ): Promise<string> {
    type ContentPart = { text?: string; [key: string]: unknown };
    type MessageContent = string | ContentPart[];

    const result = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature,
      response_format: responseFormat,
    });

    const responseContent = result.choices[0]?.message?.content as MessageContent | null;
    if (!responseContent) {
      throw new Error("Azure OpenAI returned an empty response");
    }

    if (typeof responseContent === "string") {
      return responseContent;
    }

    if (Array.isArray(responseContent as ContentPart[])) {
      const parts = responseContent as ContentPart[];
      return parts
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .join("")
        .trim();
    }

    throw new Error("Azure OpenAI returned an unsupported response format");
  }

  private ensureAzureConfig(): void {
    const deploymentName = env.AZURE_OPENAI_MODEL || env.AZURE_OPENAI_DEPLOYMENT;
    if (!env.AZURE_OPENAI_ENDPOINT) {
      throw new Error("AZURE_OPENAI_ENDPOINT is required when AI_PROVIDER=azure");
    }
    if (!env.AZURE_OPENAI_API_KEY) {
      throw new Error("AZURE_OPENAI_API_KEY is required when AI_PROVIDER=azure");
    }
    if (!deploymentName) {
      throw new Error(
        "AZURE_OPENAI_DEPLOYMENT (or AZURE_OPENAI_MODEL) is required when AI_PROVIDER=azure",
      );
    }
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
      throw new InvariantError(`Azure OpenAI returned invalid ${field}: ${value}`);
    }
    return date;
  }

  private requireField<T>(value: T | null | undefined, field: string): T {
    if (value === null || value === undefined) {
      throw new InvariantError(`Azure OpenAI response is missing required field: ${field}`);
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

  private toChatHistory(history: ChatMessage[], limit = 50): ChatMessageParam[] {
    if (!history.length) return [];
    const recent = history.slice(-limit);
    return recent.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private getJsonSchemaResponseFormat(schema: unknown, name: string): ResponseFormat {
    const normalizedSchema = this.normalizeJsonSchema(schema);
    return {
      type: "json_schema",
      json_schema: {
        name,
        schema: normalizedSchema as Record<string, unknown>,
        strict: true,
      },
    };
  }

  private normalizeJsonSchema(schema: unknown): unknown {
    if (!schema || typeof schema !== "object") return schema;
    const cloned = { ...(schema as Record<string, unknown>) };

    if ("properties" in cloned && typeof cloned.properties === "object" && cloned.properties) {
      const keys = Object.keys(cloned.properties as Record<string, unknown>);
      (cloned as { required?: string[] }).required = keys;
    }

    if ("properties" in cloned && typeof cloned.properties === "object" && cloned.properties) {
      const props = cloned.properties as Record<string, unknown>;
      for (const key of Object.keys(props)) {
        props[key] = this.normalizeJsonSchema(props[key]);
      }
    }

    return cloned;
  }
}
