import type { WaMessage } from "@/domain/entities/WaMessage";
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

  async execute(message: WaMessage): Promise<object> {
    let messageContent = "";
    messageContent += "📚 *SELAMAT DATANG DI KA'EL* 📚\n";
    messageContent +=
      "Ka'el adalah layanan cerdas yang membantu kamu menemukan berbagai event, lomba, magang, hingga pendanaan yang sesuai dengan minat dan profilmu.\n\n";
    messageContent +=
      "Temukan peluang pengembangan diri dengan cara yang lebih mudah, cepat, dan personal!\n\n";
    messageContent +=
      "> Saat ini anda berinteraksi dengan bot Ka'el. Sebelum menggunakan layanan, silahkan mendaftar akun dengan perintah berikut: \n";
    messageContent += "> `@register <nama>`";

    const messageSent = await this.deps.whatsappService.sendToChat(
      message.from,
      messageContent,
      message.chatType,
    );
    return messageSent;
  }
}
