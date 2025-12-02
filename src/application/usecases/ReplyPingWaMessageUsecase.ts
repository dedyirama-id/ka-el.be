import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  userRepository: UserRepository;
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
};

export class ReplyPingWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<object> {
    const messageSent = await this.deps.whatsappService.sendToChat(
      message.from,
      "pong!",
      message.chatType,
    );
    await this.deps.messageRepository.create({
      id: this.deps.idGenerator.generateId(),
      phoneNumber: message.from,
      role: "system",
      content: messageSent.text,
      meta: { id: messageSent.id, text: messageSent.text },
    });

    return messageSent;
  }
}
