import type { WaMessage } from "@/domain/entities/WaMessage";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  userRepository: UserRepository;
  whatsappService: WhatsappService;
};

export class ReplyPingWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<object> {
    const messageSent = await this.deps.whatsappService.sendToChat(
      message.from,
      "pong!",
      message.chatType,
    );

    return messageSent;
  }
}
