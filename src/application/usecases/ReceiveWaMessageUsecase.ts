import { NotFoundError } from "@/commons/exceptions/NotFoundError";
import { MessageReceived } from "@/domain/entities/MessageReceived";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";

type Deps = {
  idGenerator: IdGeneratorService;
  messageRepository: MessageRepository;
  userRepository: UserRepository;
};

type Input = {
  from: string;
  body: string;
};

export class ReceiveWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(input: Input): Promise<MessageReceived> {
    const storedPhone = input.from.replace(/^whatsapp:/, "");

    const user = await this.deps.userRepository.findByPhone(storedPhone);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const id = `msg-${this.deps.idGenerator.generateId()}`;
    const message = await this.deps.messageRepository.create({
      id,
      userId: user.id,
      role: "user",
      content: input.body,
      meta: null,
    });

    const intent = input.body.trim().split(/\s+/).at(0)?.toLowerCase() ?? "";
    const value = input.body.replace(new RegExp(`^${intent}\\b\\s*`, "i"), "").trim();

    return new MessageReceived(id, storedPhone, intent, value, message.content);
  }
}
