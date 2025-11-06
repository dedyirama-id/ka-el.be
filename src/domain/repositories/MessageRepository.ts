import type { Message } from "../entities/Message";
import type { MessageRole } from "../value-objects/MessageRole";

export interface MessageRepository {
  create(message: {
    id: string;
    userId: string;
    role: MessageRole;
    content: string;
    meta: object | null;
  }): Promise<Message>;
}
