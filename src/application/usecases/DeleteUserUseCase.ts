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
    const user = await this.deps.userRepository.findByPhone(message.from);
    if (!user) {
      const messageSent = await this.deps.whatsappService.sendToChat(
        message.from,
        "Penghapusan tidak dapat dilakuan, kamu belum membuat akun",
        message.chatType,
      );
      await this.saveSystemMessage(message.from, messageSent.text, messageSent.id);
      return false;
    }
    if (!message.value) {
      const token = this.deps.idGenerator.generateId();
      user.setDeleteToken(token);
      await this.deps.userRepository.save(user);
      let messageSent = await this.deps.whatsappService.sendToChat(
        message.from,
        "Tolong kirim ulang pesan ini jika anda yakin untuk menghapus akun",
        message.chatType,
      );
      await this.saveSystemMessage(message.from, messageSent.text, messageSent.id);
      messageSent = await this.deps.whatsappService.sendToChat(
        message.from,
        `@destroy ${token}`,
        message.chatType,
      );
      await this.saveSystemMessage(message.from, messageSent.text, messageSent.id);
      return true;
    }
    try {
      await this.deps.userRepository.deleteAccount(message.value);
      const messageSent = await this.deps.whatsappService.sendToChat(
        message.from,
        "Akunmu berhasil terhapus secara permanen jika ingin membuat akun kembali kirim pesan @register",
        message.chatType,
      );
      await this.saveSystemMessage(message.from, messageSent.text, messageSent.id);
    } catch (e) {
      const messageSent = await this.deps.whatsappService.sendToChat(
        message.from,
        "Penghapusan gagal dilakukan, periksa kode token yang kamu kirimkan",
        message.chatType,
      );
      await this.saveSystemMessage(message.from, messageSent.text, messageSent.id);
      logger.error("Failed to delete user account", { error: e });
      return false;
    }
    return true;
  }

  private async saveSystemMessage(to: string, content: string, id: string) {
    await this.deps.messageRepository.create({
      id: this.deps.idGenerator.generateId(),
      phoneNumber: to,
      role: "system",
      content,
      meta: { id, text: content },
    });
  }
}
