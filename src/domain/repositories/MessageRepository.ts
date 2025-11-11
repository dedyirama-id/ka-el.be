import type { Message } from "../entities/Message";
import type { MessageRole } from "../value-objects/MessageRole";
import type { JsonValue } from "../value-objects/JsonValue";

export interface MessageRepository {
  create(message: {
    id: string;
    phoneNumber: string;
    role: MessageRole;
    content: string;
    meta: JsonValue | null;
  }): Promise<Message>;
}
