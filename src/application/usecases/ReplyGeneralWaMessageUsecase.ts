import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService, ChatMessage, UserContext } from "@/domain/Services/AIService";
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
    if (!user || !user.isLoggedIn()) {
      return false;
    }

    const history = await this.loadHistory(message.from);
    const userContext: UserContext = { name: user.name, profile: user.profile ?? null };
    const replyMessage = await this.deps.aiService.replyGeneralMessage(
      message.text,
      history,
      userContext,
    );
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

  private async loadHistory(phoneNumber: string): Promise<ChatMessage[]> {
    const messages = await this.deps.messageRepository.findRecentByPhone(phoneNumber, 20);
    return messages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : msg.role === "tool" ? "system" : msg.role,
      content: msg.content,
    }));
  }
}
