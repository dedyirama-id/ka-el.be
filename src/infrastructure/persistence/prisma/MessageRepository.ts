import { Prisma } from "@prisma/client";
import type { MessageRole, PrismaClient } from "@prisma/client";
import type { Message } from "@/domain/entities/Message";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { JsonValue } from "@/domain/value-objects/JsonValue";
import { toDomainMessage } from "@/infrastructure/mapper/message-mapper";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly db: PrismaTx) {}

  async create(message: {
    id: string;
    phoneNumber: string;
    role: MessageRole;
    content: string;
    meta: JsonValue | null;
  }): Promise<Message> {
    const row = await this.db.message.create({
      data: {
        id: message.id,
        phoneNumber: message.phoneNumber,
        role: message.role,
        content: message.content,
        meta: message.meta ?? Prisma.JsonNull,
      },
    });
    return toDomainMessage(row);
  }

  async findRecentByPhone(phoneNumber: string, limit = 20): Promise<Message[]> {
    const rows = await this.db.message.findMany({
      where: { phoneNumber },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.reverse().map(toDomainMessage);
  }
}
