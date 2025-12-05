import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import { logger } from "@/commons/logger";
import { replyToUser } from "./utils/messageReply";

type Deps = {
  whatsappService: WhatsappService;
  userRepository: UserRepository;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
};

export class ReplyLoginWaMessageUsecase {
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
      if (user.isLoggedIn()) {
        await replyToUser(
          this.deps,
          message,
          "Kamu sudah login. Kalau ingin keluar gunakan perintah @logout.",
        );
        return false;
      }

      user.setIsLoggedIn(true);
      await this.deps.userRepository.save(user);

      const messageContent = `Halo, ${this.toTitleCase(user.name)}. Selamat datang kembali👋🏻`;
      await replyToUser(this.deps, message, messageContent);

      return true;
    } catch (error) {
      logger.error("Failed to process login command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat memproses loginmu. Coba lagi sebentar lagi ya.",
        { save: false },
      );
      return false;
    }
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
