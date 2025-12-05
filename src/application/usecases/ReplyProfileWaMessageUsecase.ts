import { Tag } from "@/domain/entities/Tag";
import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import { logger } from "@/commons/logger";
import { replyToUser } from "./utils/messageReply";

type Deps = {
  messageRepository: MessageRepository;
  userRepository: UserRepository;
  whatsappService: WhatsappService;
  tagRepository: TagRepository;
  aiService: AIService;
  messageGenerator: MessageGenerator;
  idGenerator: IdGeneratorService;
};

export class ReplyProfileWaMessageUsecase {
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

      if (!message.text || message.text.trim() === "") {
        await replyToUser(
          this.deps,
          message,
          [
            `Kamu masih belum mengirimkan deskripsi profile. Tolong berikan Kael deskripsi profilemu.`,
            `Contoh: \`@profile saya ingin mengikuti lomba BPC (Business Plan Competition)\``,
          ].join("\n"),
        );
        return false;
      }

      const proofedProfile = await this.deps.aiService.proofreadingMessage(message.text);
      const tags = await this.deps.aiService.parseTags(proofedProfile);
      const existingTags = await this.deps.tagRepository.findByNames(
        tags.map((tag) => tag.toLowerCase()),
      );
      const newTagNames = tags
        .filter(
          (tag) =>
            !existingTags.some(
              (existingTag) => existingTag.name.toLowerCase() === tag.toLowerCase(),
            ),
        )
        .map((tagName) => Tag.createNew(tagName));
      const newTags = await this.deps.tagRepository.saveMany(newTagNames);

      user.setProfile(proofedProfile);
      user.setTags([...existingTags, ...newTags]);
      const updatedUser = await this.deps.userRepository.save(user);

      const messageContent = this.deps.messageGenerator.generateProfileUpdateMessage(
        updatedUser.name,
        updatedUser.profile ?? "",
        updatedUser.tags.map((tag) => tag.name),
      );
      await replyToUser(this.deps, message, messageContent);
      return true;
    } catch (error) {
      logger.error("Failed to process profile command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat memperbarui profilmu. Coba lagi beberapa saat lagi ya.",
      );
      return false;
    }
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
