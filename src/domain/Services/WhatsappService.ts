import type { MessageSent } from "../entities/MessageSent";

export interface WhatsappService {
  sendWhatsApp(to: string, message: string): Promise<MessageSent>;
}
