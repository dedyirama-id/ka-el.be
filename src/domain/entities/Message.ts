import type { JsonValue } from "../value-objects/JsonValue";
import type { MessageRole } from "../value-objects/MessageRole";

export class Message {
  constructor(
    public readonly id: string,
    public readonly phoneNumber: string,
    public role: MessageRole,
    public content: string,
    public meta: JsonValue | null,
    public readonly createdAt: Date,
  ) {}
}
