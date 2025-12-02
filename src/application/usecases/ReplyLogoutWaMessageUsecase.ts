import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  whatsappService: WhatsappService;
  userRepository: UserRepository;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
};

export class ReplyLogoutWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    const user = await this.deps.userRepository.findByPhone(message.from);
    if (!user || !user.isLoggedIn()) {
      return false;
    }

    user.setIsLoggedIn(false);
    await this.deps.userRepository.save(user);

    const messageContent = `Halo, ${this.toTitleCase(user.name)}. Kamu berhasil logout. Sampai jumpa lain waktu👋🏻`;
    const messageSent = await this.deps.whatsappService.sendToChat(
      message.from,
      messageContent,
      message.chatType,
    );
    await this.deps.messageRepository.create({
      id: this.deps.idGenerator.generateId(),
      phoneNumber: message.from,
      role: "system",
      content: messageSent.text,
      meta: { id: messageSent.id, text: messageSent.text },
    });

    return true;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
