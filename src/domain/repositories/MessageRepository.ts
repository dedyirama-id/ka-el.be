import type { Message } from "../entities/Message";
import type { MessageRole } from "../value-objects/MessageRole";

export interface MessageRepository {
  create(message: {
    id: string;
    phoneNumber: string;
    role: MessageRole;
    content: string;
    meta: object | null;
  }): Promise<Message>;
}
