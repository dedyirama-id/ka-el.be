import { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";

type Deps = {
  idGenerator: IdGeneratorService;
  messageRepository: MessageRepository;
  userRepository: UserRepository;
  aiService: AIService;
};

export class ReceiveWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<WaMessage> {
    const id = `msg-${this.deps.idGenerator.generateId()}`;
    const existingUser = await this.deps.userRepository.findByPhone(message.from);
    if (existingUser) {
      await this.deps.messageRepository.create({
        id,
        phoneNumber: message.from,
        role: "user",
        content: message.text,
        meta: null,
      });
    }

    const tokens = message.text.trim().split(/\s+/);
    if (tokens[0]?.includes("@")) {
      const intent = tokens.at(0)?.toLowerCase() ?? "";
      const value = tokens.slice(1).join(" ").trim();
      return new WaMessage({
        from: message.from,
        to: message.to,
        text: message.text,
        chatType: message.chatType,
        participant: message.participant,
        intent,
        value: value,
      });
    }

    const intent = await this.deps.aiService.parseIntent(message.text);
    return new WaMessage({
      from: message.from,
      to: message.to,
      text: message.text,
      chatType: message.chatType,
      participant: message.participant,
      intent: intent.intent,
      value: intent.value,
    });
  }
}
