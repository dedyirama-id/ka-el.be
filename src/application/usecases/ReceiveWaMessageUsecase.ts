import { MessageReceived } from "@/domain/entities/MessageReceived";
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

type Input = {
  from: string;
  body: string;
};

export class ReceiveWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(input: Input): Promise<MessageReceived> {
    const phone = input.from.replace(/^whatsapp:/, "");

    const id = `msg-${this.deps.idGenerator.generateId()}`;
    const existingUser = await this.deps.userRepository.findByPhone(phone);
    if (existingUser) {
      await this.deps.messageRepository.create({
        id,
        phoneNumber: phone,
        role: "user",
        content: input.body,
        meta: null,
      });
    }

    const tokens = input.body.trim().split(/\s+/);
    if (tokens[0]?.includes("@")) {
      const intent = tokens.at(0)?.toLowerCase() ?? "";
      const value = tokens.slice(1).join(" ").trim();
      return new MessageReceived(id, phone, intent, value, input.body);
    }

    const intent = await this.deps.aiService.parseIntent(input.body);
    return new MessageReceived(id, phone, intent.token, intent.value, input.body);
  }
}
