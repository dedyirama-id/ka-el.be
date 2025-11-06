import type { MessageSent } from "@/domain/entities/MessageSent";

export interface WhatsAppMessenger {
  sendText(msg: { to: string; body: string }): Promise<MessageSent>;
  waitUntilReady?(): Promise<void>;
}
