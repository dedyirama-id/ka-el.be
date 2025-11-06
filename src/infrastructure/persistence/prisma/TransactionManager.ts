import type { PrismaClient } from "@prisma/client";
import type { TransactionManager, UnitOfWork } from "@/application/ports/TransactionManager";
import { PrismaMessageRepository } from "./MessageRepository";
import { PrismaUserRepository } from "./UserRepository";

export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const users = new PrismaUserRepository(tx);
      const messages = new PrismaMessageRepository(tx);
      return work({ users, messages });
    });
  }
}
