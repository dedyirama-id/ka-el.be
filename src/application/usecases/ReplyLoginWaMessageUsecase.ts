import type { WaMessage } from "@/domain/entities/WaMessage";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  whatsappService: WhatsappService;
  userRepository: UserRepository;
};

export class ReplyLoginWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    const user = await this.deps.userRepository.findByPhone(message.from);
    if (!user || user.isLoggedIn() == true) {
      return false;
    }

    user.setIsLoggedIn(true);
    await this.deps.userRepository.save(user);

    const messageContent = `Halo, ${this.toTitleCase(user.name)}. Selamat datang kembali👋🏻`;
    await this.deps.whatsappService.sendToChat(message.from, messageContent, message.chatType);

    return true;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
