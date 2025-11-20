import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";

export type UnitOfWork = {
  users: UserRepository;
  messages: MessageRepository;
  events: EventRepository;
};

export interface TransactionManager {
  run<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>;
}
