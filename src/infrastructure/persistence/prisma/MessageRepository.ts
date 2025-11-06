import type { MessageRole, Prisma, PrismaClient } from "@prisma/client";
import type { Message } from "@/domain/entities/Message";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import { toDomainMessage } from "@/infrastructure/mapper/message-mapper";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly db: PrismaTx) {}

  async create(message: {
    id: string;
    userId: string;
    role: MessageRole;
    content: string;
    meta: object;
  }): Promise<Message> {
    const row = await this.db.message.create({
      data: {
        id: message.id,
        userId: message.userId,
        role: message.role,
        content: message.content,
        meta: message.meta,
      },
    });
    return toDomainMessage(row);
  }
}
