import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import { logger } from "@/commons/logger";
import { replyToUser } from "./utils/messageReply";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
  messageGenerator: MessageGenerator;
  userRepository: UserRepository;
};

export class ReplyKaelWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    try {
      const messageContent = this.deps.messageGenerator.generateWellcomeMessage();
      const user = await this.deps.userRepository.findByPhone(message.from);
      await replyToUser(this.deps, message, messageContent, { save: Boolean(user) });
      return true;
    } catch (error) {
      logger.error("Failed to reply kael message", { error, from: message.from });
      await replyToUser(
        this.deps,
        message,
        "Maaf, terjadi kesalahan saat memproses permintaanmu.",
        { save: false },
      );
      return false;
    }
  }
}
