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
    message += "✨ SELAMAT DATANG DI *KA'EL* ✨ \n";
    message +=
      "Ka'el merupakan layanan yang akan membantu anda menemukan berbagai event yang sesuai dengan minat anda. \n\n";
    message +=
      "> Saat ini anda berinteraksi dengan Bot. Untuk mulai menggunakan layanan, silahkan kirimkan salah satu pesan berikut ini: \n";
    message += "> `@register <nama>`";

    const messageSent = await this.deps.whatsappService.sendWhatsApp(targetPhone, message);
    return messageSent;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }
}
