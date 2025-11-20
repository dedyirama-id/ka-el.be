import type { PrismaClient } from "@prisma/client";
import type { TransactionManager, UnitOfWork } from "@/application/ports/TransactionManager";
import { PrismaMessageRepository } from "./MessageRepository";
import { PrismaUserRepository } from "./UserRepository";
import { PrismaEventRepository } from "./EventRepository";
import { PrismaTagRepository } from "./TagRepository";

export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const users = new PrismaUserRepository(tx);
      const messages = new PrismaMessageRepository(tx);
      const events = new PrismaEventRepository(tx);
      const tags = new PrismaTagRepository(tx);
      return work({ users, messages, events, tags });
    });
  }
}
