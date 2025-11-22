import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
  messageGenerator: MessageGenerator;
};

export class ReplyKaelWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<object> {
    let messageContent = this.deps.messageGenerator.generateWellcomeMessage();

    const messageSent = await this.deps.whatsappService.sendToChat(
      message.from,
      messageContent,
      message.chatType,
    );
    return messageSent;
  }
}
