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

  async execute(message: WaMessage): Promise<boolean> {
    const normalizedName = message.value?.trim() || "";

    const registeredUser = await this.deps.userRepository.findByPhone(message.from);

    if (registeredUser) {
      const messageContent = [
        `Nomor WA kamu sudah terdaftar sebagai *${this.toTitleCase(registeredUser.name)}.*`,
        `Gunakan perintah \`@login\` untuk login ke akunmu*`,
      ].join("\n");

      const messageSent = await this.deps.whatsappService.sendToChat(
        message.from,
        messageContent,
        message.chatType,
      );
      await this.saveSystemMessage(message.from, messageSent.text, messageSent.id);

      return false;
    }

    if (!normalizedName) {
      const messageSent = await this.deps.whatsappService.sendToChat(
        message.from,
        "Maaf, format pendaftaran kamu salah. Gunakan `@register <nama>`",
        message.chatType,
      );
      await this.saveSystemMessage(message.from, messageSent.text, messageSent.id);

      return false;
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
    await this.saveSystemMessage(message.from, messageSent.text, messageSent.id);

    return true;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }

  private async saveSystemMessage(to: string, content: string, id: string) {
    await this.deps.messageRepository.create({
      id: this.deps.idGenerator.generateId(),
      phoneNumber: to,
      role: "system",
      content,
      meta: { id, text: content },
    });
  }
}
