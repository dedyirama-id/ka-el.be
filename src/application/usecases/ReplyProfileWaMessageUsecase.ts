import { NotFoundError } from "@/commons/exceptions/NotFoundError";
import type { MessageSent } from "@/domain/entities/MessageSent";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  messageRepository: MessageRepository;
  userRepository: UserRepository;
  whatsappService: WhatsappService;
  aiService: AIService;
};

export class ReplyProfileWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(from: string, value: string): Promise<MessageSent> {
    const normalizedPhone = this.ensureWhatsappPrefix(from);
    const phoneNumber = normalizedPhone.replace(/^whatsapp:/, "");

    if (!value) {
      await this.deps.whatsappService.sendWhatsApp(
        phoneNumber,
        "Kamu masih belum mengirimkan deskripsi profile. Tolong berikan Kael deskripsi profilemu. Contoh: @profile saya ingin mengikuti lomba BPC (Business Plan Competition)",
      );
    }

    const existingUser = await this.deps.userRepository.findByPhone(phoneNumber);
    if (!existingUser) {
      throw new NotFoundError("User Not Found");
    }

    const proofedProfile = await this.deps.aiService.proofreadingMessage(value);
    await this.deps.userRepository.updateProfile(existingUser.id, proofedProfile);

    const message = await this.deps.whatsappService.sendWhatsApp(
      phoneNumber,
      `Okey, Kael sudah memperbarui profilemu! selamat menunggu notifikasi lomba yang sesuai dengan minatmu, ${existingUser.name}`,
    );
    return message;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
