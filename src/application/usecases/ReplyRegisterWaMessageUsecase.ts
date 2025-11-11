import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
  userRepository: UserRepository;
};

export class ReplyRegisterWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(from: string, name: string): Promise<object> {
    const normalizedPhone = this.ensureWhatsappPrefix(from);
    const phoneNumber = normalizedPhone.replace(/^whatsapp:/, "");
    const normalizedName = name.trim();

    const registeredUser = await this.deps.userRepository.findByPhone(phoneNumber);

    if (registeredUser) {
      await this.deps.whatsappService.sendWhatsApp(
        phoneNumber,
        `Nomor WA kamu sudah terdaftar sebagai *${this.toTitleCase(registeredUser.name)}*`,
      );

      return {
        status: "already_registered",
      };
    }

    if (!normalizedName) {
      await this.deps.whatsappService.sendWhatsApp(
        phoneNumber,
        "Maaf, format pendaftaran kamu salah. Gunakan `@register <nama>`",
      );

      return {
        status: "invalid_format",
      };
    }

    const id = this.deps.idGenerator.generateId();
    const user = await this.deps.userRepository.create({
      id,
      phoneE164: phoneNumber,
      name: normalizedName.toLowerCase(),
    });

    let message = "";
    message += `*Selamat ${this.toTitleCase(user.name)}, nomor telepon kamu telah terdaftar!*\n`;
    message += `Kamu sekarang dapat menggunakan layanan KA'EL. \n\n`;
    message += `> Saat ini kamu sedang berinteraksi dengan Bot.`;

    const messageSent = await this.deps.whatsappService.sendWhatsApp(phoneNumber, message);

    return messageSent;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
