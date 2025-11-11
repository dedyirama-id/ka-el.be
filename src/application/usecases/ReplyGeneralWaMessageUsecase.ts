import { NotFoundError } from "@/commons/exceptions/NotFoundError";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  userRepository: UserRepository;
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
};

export class ReplyGeneralWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(to: string): Promise<object> {
    const normalizedPhone = this.ensureWhatsappPrefix(to);
    const targetPhone = normalizedPhone.replace(/^whatsapp:/, "");

    const user = await this.deps.userRepository.findByPhone(targetPhone);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const message = await this.deps.whatsappService.sendWhatsApp(
      targetPhone,
      `Hi ${this.toTitleCase(user.name)}, layanan saat ini sedang dalam pengembangan.`,
    );

    const messageId = this.deps.idGenerator.generateId();
    await this.deps.messageRepository.create({
      id: messageId,
      phoneNumber: targetPhone,
      role: "system",
      content: message.text,
      meta: {
        id: message.id,
        text: message.text,
      },
    });

    return message;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
