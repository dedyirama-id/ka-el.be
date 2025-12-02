import type { WaMessage } from "@/domain/entities/WaMessage";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

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
    const user = await this.deps.userRepository.findByPhone(message.from);
    if (!user) {
      await this.reply(
        message,
        "Fitur ini hanya dapat diakses oleh admin yang terdaftar. Silakan daftar dan hubungi admin untuk mendapatkan akses.",
      );
      return false;
    }
    if (!user.isLoggedIn()) {
      await this.reply(
        message,
        "Fitur ini hanya dapat diakses oleh admin yang sudah login. Silakan login terlebih dahulu.",
      );
      return false;
    }
    if (!user.isAdmin()) {
      await this.reply(message, "Maaf, hanya admin yang dapat menggunakan perintah @remove_event.");
      return false;
    }

    const requestedId = this.parseRequestedId(message.text);
    if (!requestedId) {
      await this.reply(message, "Gunakan format `@remove_event <id>` untuk menghapus event.");
      return false;
    }

    const event = await this.deps.eventRepository.findById(requestedId);
    if (!event) {
      await this.reply(message, `Event dengan id ${requestedId} tidak ditemukan.`);
      return false;
    }

    const deleted = await this.deps.eventRepository.deleteById(requestedId);
    if (!deleted) {
      await this.reply(
        message,
        "Gagal menghapus event. Coba lagi beberapa saat atau hubungi admin.",
      );
      return false;
    }

    const details = this.deps.messageGenerator.generateEventMessage(event);
    const content = [`✅ Event #${requestedId} berhasil dihapus.`, details].join("\n\n");
    const sent = await this.deps.whatsappService.sendToChat(
      message.from,
      content,
      message.chatType,
    );
    await this.saveSystemMessage(message.from, sent.text, sent.id);
    return true;
  }

  private parseRequestedId(text: string): number | null {
    const match = text.trim().match(/^@remove_event\s+(\d+)\s*$/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private async reply(message: WaMessage, content: string) {
    const sent = await this.deps.whatsappService.sendToChat(
      message.from,
      content,
      message.chatType,
    );
    await this.saveSystemMessage(message.from, sent.text, sent.id);
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
