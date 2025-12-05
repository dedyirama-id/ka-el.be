import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import type { MessageGenerator } from "../../domain/Services/MessageGenerator";
import type { WaMessage } from "@/domain/entities/WaMessage";
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

export class DeleteUserUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    try {
      const user = await this.deps.userRepository.findByPhone(message.from);
      if (!user) {
        await replyToUser(
          this.deps,
          message,
          "Penghapusan tidak dapat dilakuan, kamu belum membuat akun",
          { save: false },
        );
        return false;
      }
      if (!message.value) {
        const token = this.deps.idGenerator.generateId();
        user.setDeleteToken(token);
        await this.deps.userRepository.save(user);
        await replyToUser(
          this.deps,
          message,
          "Tolong kirim ulang pesan ini jika anda yakin untuk menghapus akun",
        );
        await replyToUser(this.deps, message, `@destroy ${token}`);
        return true;
      }
      try {
        await this.deps.userRepository.deleteAccount(message.value);
        await replyToUser(
          this.deps,
          message,
          "Akunmu berhasil terhapus secara permanen jika ingin membuat akun kembali kirim pesan @register",
        );
      } catch (e) {
        await replyToUser(
          this.deps,
          message,
          "Penghapusan gagal dilakukan, periksa kode token yang kamu kirimkan",
        );
        logger.error("Failed to delete user account", { error: e, from: message.from });
        return false;
      }
      return true;
    } catch (error) {
      logger.error("Failed to process delete account command", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat memproses permintaan hapus akunmu. Coba lagi sebentar lagi ya.",
        { save: false },
      );
      return false;
    }
  }
}
