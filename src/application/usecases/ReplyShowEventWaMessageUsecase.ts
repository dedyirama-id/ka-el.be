import type { WaMessage } from "@/domain/entities/WaMessage";
import type { EventRepository } from "@/domain/repositories/EventRepository";
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
  userRepository: UserRepository;
  idGenerator: IdGeneratorService;
  eventRepository: EventRepository;
  messageGenerator: MessageGenerator;
};

export class ReplyShowEventWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    try {
      const user = await this.deps.userRepository.findByPhone(message.from);
      if (!user) {
        await replyToUser(
          this.deps,
          message,
          "Fitur ini hanya dapat diakses oleh pengguna yang terdaftar. Silakan daftar dan login terlebih dahulu.",
          { save: false },
        );
        return false;
      }
      if (!user.isLoggedIn()) {
        await replyToUser(
          this.deps,
          message,
          "Fitur ini hanya dapat diakses oleh pengguna yang sudah login. Silakan login terlebih dahulu.",
        );
        return false;
      }

      const requestedId = this.parseRequestedId(message.text);
      if (!requestedId) {
        await replyToUser(
          this.deps,
          message,
          "Gunakan format `@show_event <id>` untuk melihat detail event.",
        );
        return false;
      }

      const event = await this.deps.eventRepository.findById(requestedId);
      if (!event) {
        await replyToUser(
          this.deps,
          message,
          `Event dengan id \`${requestedId}\` tidak ditemukan.`,
        );
        return false;
      }

      const content = this.deps.messageGenerator.generateEventMessage(event);
      await replyToUser(this.deps, message, content, { to: user.phoneE164 });
      return true;
    } catch (error) {
      logger.error("Failed to process show_event command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat mengambil detail event. Coba lagi sebentar lagi ya.",
        { save: false },
      );
      return false;
    }
  }

  private parseRequestedId(text: string): number | null {
    const match = text.trim().match(/^@show_event\s+(\d+)\s*$/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
}
