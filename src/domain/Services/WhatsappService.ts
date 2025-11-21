import type { MessageSent } from "../entities/MessageSent";
import type { ChatType } from "../value-objects/ChatType";

export interface WhatsappService {
  sendToChat(to: string, message: string, chatType: ChatType): Promise<MessageSent>;
}
