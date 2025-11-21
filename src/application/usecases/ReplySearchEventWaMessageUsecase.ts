import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import type { MessageGenerator } from "../../domain/Services/MessageGenerator";

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

  async execute(from: string, text: string): Promise<boolean> {
    const normalizedPhone = this.ensureWhatsappPrefix(from);
    const phoneNumber = normalizedPhone.replace(/^whatsapp:/, "");
    const existingUser = await this.deps.userRepository.findByPhone(phoneNumber);
    if (!existingUser) {
      throw new Error("User not found");
    }
    const queries = await this.deps.aiService.parseSearchQuery(text);
    const events = await this.deps.eventRepository.search(queries);

    if (events.length === 0) {
      await this.deps.whatsappService.sendWhatsApp(
        existingUser.phoneE164,
        `Maaf saat ini lomba yang kamu cari tidak ada`,
      );
      return false;
    }

    await this.deps.whatsappService.sendWhatsApp(
      existingUser.phoneE164,
      `Hi, ini hasil pencarianmu`,
    );
    for (const event of events) {
      const message = this.deps.messageGenerator.generateEventMessage(event);
      await this.deps.whatsappService.sendWhatsApp(existingUser.phoneE164, message);
    }

    return true;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
