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

export class ReplyShowEventWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    const user = await this.deps.userRepository.findByPhone(message.from);
    if (!user) {
      await this.reply(
        message,
        "Fitur ini hanya dapat diakses oleh pengguna yang terdaftar. Silakan daftar dan login terlebih dahulu.",
      );
      return false;
    }
    if (!user.isLoggedIn()) {
      await this.reply(
        message,
        "Fitur ini hanya dapat diakses oleh pengguna yang sudah login. Silakan login terlebih dahulu.",
      );
      return false;
    }

    const requestedId = this.parseRequestedId(message.text);
    if (!requestedId) {
      await this.reply(message, "Gunakan format `@show_event <id>` untuk melihat detail event.");
      return false;
    }

    const event = await this.deps.eventRepository.findById(requestedId);
    if (!event) {
      await this.reply(message, `Event dengan id \`${requestedId}\` tidak ditemukan.`);
      return false;
    }

    const content = this.deps.messageGenerator.generateEventMessage(event);
    const sent = await this.deps.whatsappService.sendToChat(
      user.phoneE164,
      content,
      message.chatType,
    );
    await this.saveSystemMessage(user.phoneE164, sent.text, sent.id);
    return true;
  }

  private parseRequestedId(text: string): number | null {
    const match = text.trim().match(/^@show_event\s+(\d+)\s*$/i);
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
