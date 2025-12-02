import type { Event } from "../entities/Event";
import type { Intent } from "../entities/Intent";

export type SearchableEvent = {
  id: number;
  title: string;
  description: string | null;
  organizer: string;
  tags: string[];
  startDate: Date;
  endDate: Date;
  priceMin: number;
  priceMax: number;
};

export interface AIService {
  replyGeneralMessage(message: string): Promise<string>;
  proofreadingMessage(message: string): Promise<string>;
  parseEvent(message: string): Promise<Event>;
  parseIntent(message: string): Promise<Intent>;
  parseTags(message: string): Promise<string[]>;
  parseSearchQuery(message: string): Promise<string[]>;
  findMatchingEventIds(query: string, events: SearchableEvent[]): Promise<number[]>;
}
