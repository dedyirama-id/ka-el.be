import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  userRepository: UserRepository;
  whatsappService: WhatsappService;
};

export class ReplyPingWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(to: string): Promise<object> {
    const targetPhone = to.replace(/^whatsapp:/, "");

    const message = await this.deps.whatsappService.sendWhatsApp(targetPhone, "pong!");

    return message;
  }
}
