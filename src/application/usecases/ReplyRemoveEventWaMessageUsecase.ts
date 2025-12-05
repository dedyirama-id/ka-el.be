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

export class ReplyRemoveEventWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    try {
      const user = await this.deps.userRepository.findByPhone(message.from);
      if (!user) {
        await replyToUser(
          this.deps,
          message,
          "Fitur ini hanya dapat diakses oleh admin yang terdaftar. Silakan daftar dan hubungi admin untuk mendapatkan akses.",
          { save: false },
        );
        return false;
      }
      if (!user.isLoggedIn()) {
        await replyToUser(
          this.deps,
          message,
          "Fitur ini hanya dapat diakses oleh admin yang sudah login. Silakan login terlebih dahulu.",
        );
        return false;
      }
      if (!user.isAdmin()) {
        await replyToUser(
          this.deps,
          message,
          "Maaf, hanya admin yang dapat menggunakan perintah @remove_event.",
        );
        return false;
      }

      const requestedId = this.parseRequestedId(message.text);
      if (!requestedId) {
        await replyToUser(
          this.deps,
          message,
          "Gunakan format `@remove_event <id>` untuk menghapus event.",
        );
        return false;
      }

      const event = await this.deps.eventRepository.findById(requestedId);
      if (!event) {
        await replyToUser(this.deps, message, `Event dengan id ${requestedId} tidak ditemukan.`);
        return false;
      }

      const deleted = await this.deps.eventRepository.deleteById(requestedId);
      if (!deleted) {
        await replyToUser(
          this.deps,
          message,
          "Gagal menghapus event. Coba lagi beberapa saat atau hubungi admin.",
        );
        return false;
      }

      const details = this.deps.messageGenerator.generateEventMessage(event);
      const content = [`✅ Event #${requestedId} berhasil dihapus.`, details].join("\n\n");
      await replyToUser(this.deps, message, content);
      return true;
    } catch (error) {
      logger.error("Failed to process remove_event command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat menghapus event. Coba lagi sebentar lagi ya.",
        { save: false },
      );
      return false;
    }
  }

  private parseRequestedId(text: string): number | null {
    const match = text.trim().match(/^@remove_event\s+(\d+)\s*$/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
}
