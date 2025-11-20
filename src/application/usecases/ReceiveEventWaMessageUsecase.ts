import { Tag } from "@/domain/entities/Tag";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
  eventRepository: EventRepository;
  tagRepository: TagRepository;
  aiService: AIService;
};

export class ReplyEventWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(from: string, rawEvent: string): Promise<object> {
    const normalizedPhone = this.ensureWhatsappPrefix(from);
    const phoneNumber = normalizedPhone.replace(/^whatsapp:/, "");

    const parsedEvent = await this.deps.aiService.parseEvent(rawEvent);
    const tags = parsedEvent.tags.map((tag) => tag.name.toLowerCase());
    const existingTags = await this.deps.tagRepository.findByNames(tags);
    const newTagNames = tags
      .filter(
        (tagName) =>
          !existingTags.some((existingTag) => existingTag.name.toLowerCase() === tagName),
      )
      .map((tagName) => Tag.createNew(tagName));
    const newTags = await this.deps.tagRepository.saveMany(newTagNames);

    parsedEvent.setTags([...existingTags, ...newTags]);
    const event = await this.deps.eventRepository.save(parsedEvent);

    let message = [
      `Terima kasih. Event *${this.toTitleCase(event.title)}* berhasil disimpan\n`,
    ].join("\n");

    const messageSent = await this.deps.whatsappService.sendWhatsApp(phoneNumber, message);
    return messageSent;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
