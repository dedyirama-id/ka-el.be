import type { WaMessage } from "@/domain/entities/WaMessage";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import { logger } from "@/commons/logger";
import { replyToUser } from "./utils/messageReply";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  userRepository: UserRepository;
  idGenerator: IdGeneratorService;
  eventRepository: EventRepository;
};

export class ReplyListEventWaMessageUsecase {
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
          "Maaf, hanya admin yang dapat menggunakan perintah @list_event.",
        );
        return false;
      }

      const events = await this.deps.eventRepository.findAll();
      if (events.length === 0) {
        await replyToUser(this.deps, message, "Belum ada event yang terdaftar.");
        return true;
      }

      const listItems = events
        .filter((event) => event.id !== undefined)
        .map((event) => `${event.id}. ${event.title}`);

      if (listItems.length === 0) {
        await replyToUser(this.deps, message, "Belum ada event yang terdaftar.");
        return true;
      }

      const content = [`*# Daftar Event*`, ...listItems].join("\n");
      await replyToUser(this.deps, message, content, { to: user.phoneE164 });
      return true;
    } catch (error) {
      logger.error("Failed to process list_event command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat mengambil daftar event. Coba lagi sebentar lagi ya.",
        { save: false },
      );
      return false;
    }
  }
}
