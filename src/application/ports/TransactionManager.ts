import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";

export type UnitOfWork = {
  users: UserRepository;
  messages: MessageRepository;
  events: EventRepository;
  tags: TagRepository;
};

export interface TransactionManager {
  run<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>;
}
