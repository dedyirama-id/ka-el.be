import { NotFoundError } from "@/commons/exceptions/NotFoundError";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
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

  async execute(phoneNumber: string, message: string): Promise<object> {
    const normalizedPhone = this.ensureWhatsappPrefix(phoneNumber);
    const targetPhone = normalizedPhone.replace(/^whatsapp:/, "");

    const user = await this.deps.userRepository.findByPhone(targetPhone);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const replyMessage = await this.deps.aiService.replyGeneralMessage(message);
    const messageSent = await this.deps.whatsappService.sendWhatsApp(targetPhone, replyMessage);

    const messageId = this.deps.idGenerator.generateId();
    await this.deps.messageRepository.create({
      id: messageId,
      phoneNumber: targetPhone,
      role: "system",
      content: messageSent.text,
      meta: {
        id: messageSent.id,
        text: messageSent.text,
      },
    });

    return messageSent;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
