import { NotFoundError } from "@/commons/exceptions/NotFoundError";
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

    const user = await this.deps.userRepository.findByPhone(targetPhone);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const message = await this.deps.whatsappService.sendWhatsApp(targetPhone, "pong!");

    return message;
  }
}
