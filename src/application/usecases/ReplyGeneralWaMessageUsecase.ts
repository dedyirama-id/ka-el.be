import { NotFoundError } from "@/commons/exceptions/NotFoundError";
import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  userRepository: UserRepository;
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
  aiService: AIService;
};

export class ReplyGeneralWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    const user = await this.deps.userRepository.findByPhone(message.from);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const replyMessage = await this.deps.aiService.replyGeneralMessage(message.text);
    const messageSent = await this.deps.whatsappService.sendToChat(
      message.from,
      replyMessage,
      message.chatType,
    );
    const messageId = this.deps.idGenerator.generateId();
    await this.deps.messageRepository.create({
      id: messageId,
      phoneNumber: message.from,
      role: "system",
      content: messageSent.text,
      meta: {
        id: messageSent.id,
        text: messageSent.text,
      },
    });

    return true;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
