import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
  userRepository: UserRepository;
  messageGenerator: MessageGenerator;
};

export class ReplyRegisterWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<object> {
    const normalizedName = message.value?.trim() || "";

    const registeredUser = await this.deps.userRepository.findByPhone(message.from);

    if (registeredUser) {
      await this.deps.whatsappService.sendToChat(
        message.from,
        `Nomor WA kamu sudah terdaftar sebagai *${this.toTitleCase(registeredUser.name)}*`,
        message.chatType,
      );

      return {
        status: "already_registered",
      };
    }

    if (!normalizedName) {
      await this.deps.whatsappService.sendToChat(
        message.from,
        "Maaf, format pendaftaran kamu salah. Gunakan `@register <nama>`",
        message.chatType,
      );

      return {
        status: "invalid_format",
      };
    }

    const id = this.deps.idGenerator.generateId();
    const user = await this.deps.userRepository.create({
      id,
      phoneE164: message.from,
      name: normalizedName.toLowerCase(),
    });

    let messageContent = this.deps.messageGenerator.generateOnboardingMessage(user.name);
    const messageSent = await this.deps.whatsappService.sendToChat(
      message.from,
      messageContent,
      message.chatType,
    );

    return messageSent;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
