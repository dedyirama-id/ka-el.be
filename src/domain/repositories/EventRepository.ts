import type { Event } from "../entities/Event";

export interface EventRepository {
  save(event: Event): Promise<Event>;
  search(keywords: string[]): Promise<Event[]>;
  findAvailable(limit?: number): Promise<Event[]>;
  findByIds(ids: number[]): Promise<Event[]>;
  findById(id: number): Promise<Event | null>;
}
