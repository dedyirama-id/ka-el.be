import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";

export type UnitOfWork = {
  users: UserRepository;
  messages: MessageRepository;
};

export interface TransactionManager {
  run<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>;
}
