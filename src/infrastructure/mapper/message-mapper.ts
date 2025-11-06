import type { Message as MessageRow } from "@prisma/client";
import { Message } from "@/domain/entities/Message";

export const toDomainMessage = (row: MessageRow): Message =>
  new Message(row.id, row.userId, row.role, row.content, null, row.createdAt);
