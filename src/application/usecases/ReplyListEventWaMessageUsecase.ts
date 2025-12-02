import type { WaMessage } from "@/domain/entities/WaMessage";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

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
      await this.reply(message, "Maaf, hanya admin yang dapat menggunakan perintah @list_event.");
      return false;
    }

    const events = await this.deps.eventRepository.findAll();
    if (events.length === 0) {
      await this.reply(message, "Belum ada event yang terdaftar.");
      return true;
    }

    const listItems = events
      .filter((event) => event.id !== undefined)
      .map((event) => `${event.id}. ${event.title}`);

    if (listItems.length === 0) {
      await this.reply(message, "Belum ada event yang terdaftar.");
      return true;
    }

    const content = [`*# Daftar Event*`, ...listItems].join("\n");
    const sent = await this.deps.whatsappService.sendToChat(
      user.phoneE164,
      content,
      message.chatType,
    );
    await this.saveSystemMessage(user.phoneE164, sent.text, sent.id);
    return true;
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
