import type { WhatsAppMessenger } from "@/application/ports/WhatsappMessenger";
import type { MessageSent } from "@/domain/entities/MessageSent";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

export class WhatsappServiceAdapter implements WhatsappService {
  constructor(private readonly messenger: WhatsAppMessenger) {}

  async sendWhatsApp(to: string, message: string): Promise<MessageSent> {
    const recipient = to.trim();
    if (!recipient) {
      throw new Error("WhatsApp recipient must be provided");
    }

    const messageSent = await this.messenger.sendText({
      to: recipient,
      body: message,
    });

    return messageSent;
  }
}
