import type { Event } from "@/domain/entities/Event";
import type { WaMessage } from "@/domain/entities/WaMessage";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type {
  AIService,
  ChatMessage,
  SearchableEvent,
  UserContext,
} from "@/domain/Services/AIService";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { MessageGenerator } from "../../domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import { logger } from "@/commons/logger";
import { replyToUser } from "./utils/messageReply";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  userRepository: UserRepository;
  idGenerator: IdGeneratorService;
  eventRepository: EventRepository;
  tagRepository: TagRepository;
  aiService: AIService;
  messageGenerator: MessageGenerator;
};

export class ReplySearchEventWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    try {
      const user = await this.deps.userRepository.findByPhone(message.from);
      if (!user) {
        await replyToUser(
          this.deps,
          message,
          "Nomor WA ini belum terdaftar. Gunakan `@register <nama>` untuk membuat akun.",
          { save: false },
        );
        return false;
      }
      if (!user.isLoggedIn()) {
        await replyToUser(this.deps, message, "Kamu belum login. Gunakan perintah @login dulu ya.");
        return false;
      }

      const availableEvents = await this.deps.eventRepository.findAvailable();
      if (availableEvents.length === 0) {
        await replyToUser(this.deps, message, "Maaf, saat ini belum ada event yang tersedia");
        return false;
      }

      const history = await this.loadHistory(message.from);
      const eventsForAi: SearchableEvent[] = availableEvents
        .filter((event) => event.id !== undefined)
        .map((event) => ({
          id: event.id as number,
          title: event.title,
          description: event.description,
          organizer: event.organizer,
          tags: event.tags.map((tag) => tag.name),
          startDate: event.startDate,
          endDate: event.endDate,
          priceMin: event.priceMin,
          priceMax: event.priceMax,
        }));

      const userContext: UserContext = { name: user.name, profile: user.profile ?? null };
      const eventIds = await this.deps.aiService.findMatchingEventIds(
        message.text,
        eventsForAi,
        history,
        userContext,
      );

      if (eventIds.length === 0) {
        await replyToUser(this.deps, message, "Maaf saat ini event yang kamu cari tidak ada");
        return false;
      }

      const matchedEvents = await this.deps.eventRepository.findByIds(eventIds);
      if (matchedEvents.length === 0) {
        await replyToUser(this.deps, message, "Maaf saat ini event yang kamu cari tidak ada");
        return false;
      }

      const eventsById = new Map(matchedEvents.map((event) => [event.id as number, event]));
      const orderedEvents = eventIds
        .map((id) => eventsById.get(id))
        .filter((event): event is Event => Boolean(event));

      await replyToUser(this.deps, message, `Hi, ini hasil pencarianmu!`);
      for (const event of orderedEvents) {
        const messageContent = this.deps.messageGenerator.generateEventMessage(event);
        await replyToUser(this.deps, message, messageContent);
      }

      return true;
    } catch (error) {
      logger.error("Failed to process search_event command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat mencari event. Coba lagi sebentar lagi ya.",
        { save: false },
      );
      return false;
    }
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }

  private async loadHistory(phoneNumber: string): Promise<ChatMessage[]> {
    const messages = await this.deps.messageRepository.findRecentByPhone(phoneNumber, 20);
    return messages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : msg.role === "tool" ? "system" : msg.role,
      content: msg.content,
    }));
  }
}
