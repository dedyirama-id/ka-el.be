import type { WaMessage } from "@/domain/entities/WaMessage";
// import type { EventRepository } from "@/domain/repositories/EventRepository";
// import type { MessageRepository } from "@/domain/repositories/MessageRepository";
// import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
// import type { AIService } from "@/domain/Services/AIService";
// import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
// import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  whatsappService: WhatsappService;
  // messageRepository: MessageRepository;
  userRepository: UserRepository;
  // idGenerator: IdGeneratorService;
  // eventRepository: EventRepository;
  // tagRepository: TagRepository;
  // aiService: AIService;
  // messageGenerator: MessageGenerator;
};

export class ReplyLogoutWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    const user = await this.deps.userRepository.findByPhone(message.from);
    if (!user || !user.isLoggedIn()) {
      return false;
    }

    user.setIsLoggedIn(false);
    await this.deps.userRepository.save(user);

    const messageContent = `Halo, ${user.name}. Kamu berhasil logout. Sampai jumpa lain waktu👋🏻`;
    await this.deps.whatsappService.sendToChat(message.from, messageContent, message.chatType);

    return true;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
