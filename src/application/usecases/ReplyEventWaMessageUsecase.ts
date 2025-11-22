import { Tag } from "@/domain/entities/Tag";
import type { WaMessage } from "@/domain/entities/WaMessage";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

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

export class ReplyEventWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    const parsedEvent = await this.deps.aiService.parseEvent(message.text);
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

    const user = await this.deps.userRepository.findByPhone(message.from);
    if (user && user.isLoggedIn()) {
      const messageContent = this.deps.messageGenerator.generateNewEventMessage(event);
      await this.deps.whatsappService.sendToChat(message.from, messageContent, message.chatType);
    }

    const relatedUsers = await this.deps.userRepository.findByTags(
      parsedEvent.tags.map((tag) => tag.name),
    );

    for (const relatedUser of relatedUsers) {
      if (relatedUser.phoneE164 === message.from) continue;

      const messageContent = this.deps.messageGenerator.generateNewEventNotificationMessage(event);
      if (message.chatType === "personal") {
        await this.deps.whatsappService.sendToChat(
          relatedUser.phoneE164,
          `👋🏻 Hi, ${relatedUser.name}! Ada event baru nih...`,
          message.chatType,
        );

        await this.deps.whatsappService.sendToChat(
          relatedUser.phoneE164,
          messageContent,
          message.chatType,
        );
      }
    }

    return true;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
