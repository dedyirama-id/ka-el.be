import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import { logger } from "@/commons/logger";
import { replyToUser } from "./utils/messageReply";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
  userRepository: UserRepository;
  messageGenerator: MessageGenerator;
};

export class ReplyRegisterWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    try {
      const normalizedName = message.value?.trim() || "";

      const registeredUser = await this.deps.userRepository.findByPhone(message.from);

      if (registeredUser) {
        const messageContent = [
          `Nomor WA kamu sudah terdaftar sebagai *${this.toTitleCase(registeredUser.name)}.*`,
          `Gunakan perintah \`@login\` untuk login ke akunmu.`,
        ].join("\n");

        await replyToUser(this.deps, message, messageContent);

        return false;
      }

      if (!normalizedName) {
        await replyToUser(
          this.deps,
          message,
          "Maaf, format pendaftaran kamu salah. Gunakan `@register <nama>`",
          { save: false },
        );

        return false;
      }

      const id = this.deps.idGenerator.generateId();
      const user = await this.deps.userRepository.create({
        id,
        phoneE164: message.from,
        name: normalizedName.toLowerCase(),
      });

      const messageContent = this.deps.messageGenerator.generateOnboardingMessage(user.name);
      await replyToUser(this.deps, message, messageContent);

      return true;
    } catch (error) {
      logger.error("Failed to process register command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat memproses pendaftaranmu. Coba lagi sebentar lagi ya.",
        { save: false },
      );
      return false;
    }
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
