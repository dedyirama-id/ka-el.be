import type { Event } from "../entities/Event";

export interface EventRepository {
  save(event: Event): Promise<Event>;
}
