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

export class ReplyEventWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    try {
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

      const notifiedPhones = new Set<string>();

      const user = await this.deps.userRepository.findByPhone(message.from);
      if (user && user.isLoggedIn()) {
        const messageContent = this.deps.messageGenerator.generateNewEventMessage(event);
        await replyToUser(this.deps, message, messageContent);
        notifiedPhones.add(user.phoneE164);
      } else {
        await replyToUser(
          this.deps,
          message,
          "Event kamu sudah diterima. Buat akun atau login agar bisa mendapatkan pembaruan event lainnya.",
          { save: Boolean(user) },
        );
      }

      const adminUsers = await this.deps.userRepository.findByRole("admin");
      for (const admin of adminUsers) {
        if (notifiedPhones.has(admin.phoneE164)) continue;

        const detail = this.deps.messageGenerator.generateEventMessage(event);

        await replyToUser(
          this.deps,
          message,
          "Event baru telah ditambahkan. Periksa detailnya berikut ini.",
          { to: admin.phoneE164 },
        );

        await replyToUser(this.deps, message, detail, { to: admin.phoneE164 });
        notifiedPhones.add(admin.phoneE164);
      }

      const relatedUsers = await this.deps.userRepository.findByTags(
        parsedEvent.tags.map((tag) => tag.name),
      );

      for (const relatedUser of relatedUsers) {
        if (notifiedPhones.has(relatedUser.phoneE164)) continue;

        const messageContent =
          this.deps.messageGenerator.generateNewEventNotificationMessage(event);
        if (message.chatType === "personal") {
          await replyToUser(
            this.deps,
            message,
            `👋🏻 Hi, ${relatedUser.name}! Ada event baru nih...`,
            { to: relatedUser.phoneE164 },
          );

          await replyToUser(this.deps, message, messageContent, { to: relatedUser.phoneE164 });
        }

        notifiedPhones.add(relatedUser.phoneE164);
      }

      return true;
    } catch (error) {
      logger.error("Failed to process add_event command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat memproses event kamu. Coba lagi sebentar lagi ya.",
        { save: false },
      );
      return false;
    }
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
