import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
};

export class ReplyKaelWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(to: string): Promise<object> {
    const normalizedPhone = this.ensureWhatsappPrefix(to);
    const targetPhone = normalizedPhone.replace(/^whatsapp:/, "");

    let message = "";
    message += "📚 *SELAMAT DATANG DI KA'EL* 📚\n";
    message +=
      "Ka'el adalah layanan cerdas yang membantu kamu menemukan berbagai event, lomba, magang, hingga pendanaan yang sesuai dengan minat dan profilmu.\n\n";
    message +=
      "Temukan peluang pengembangan diri dengan cara yang lebih mudah, cepat, dan personal!\n\n";
    message +=
      "> Saat ini anda berinteraksi dengan bot Ka'el. Sebelum menggunakan layanan, silahkan mendaftar akun dengan perintah berikut: \n";
    message += "> `@register <nama>`";

    const messageSent = await this.deps.whatsappService.sendWhatsApp(targetPhone, message);
    return messageSent;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }
}
