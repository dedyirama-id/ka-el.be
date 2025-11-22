import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import type { MessageGenerator } from "../../domain/Services/MessageGenerator";
import type { WaMessage } from "@/domain/entities/WaMessage";

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
    const user = await this.deps.userRepository.findByPhone(message.from);
    if (!user || !user.isLoggedIn()) {
      return false;
    }
    const queries = await this.deps.aiService.parseSearchQuery(message.text);
    const events = await this.deps.eventRepository.search(queries);

    if (events.length === 0) {
      await this.deps.whatsappService.sendToChat(
        user.phoneE164,
        `Maaf saat ini event yang kamu cari tidak ada`,
        message.chatType,
      );
      return false;
    }

    await this.deps.whatsappService.sendToChat(
      user.phoneE164,
      `Hi, ini hasil pencarianmu`,
      message.chatType,
    );
    for (const event of events) {
      const messageContent = this.deps.messageGenerator.generateEventMessage(event);
      await this.deps.whatsappService.sendToChat(user.phoneE164, messageContent, message.chatType);
    }

    return true;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
