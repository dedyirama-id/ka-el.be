import type { Event } from "../entities/Event";
import type { Intent } from "../entities/Intent";

export type ChatMessage = {
  role: "user" | "system" | "assistant";
  content: string;
};

export type UserContext = {
  name: string;
  profile: string | null;
};

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
  replyGeneralMessage(message: string, history: ChatMessage[], user?: UserContext): Promise<string>;
  proofreadingMessage(message: string): Promise<string>;
  parseEvent(message: string): Promise<Event>;
  parseIntent(message: string): Promise<Intent>;
  parseTags(message: string): Promise<string[]>;
  parseSearchQuery(message: string): Promise<string[]>;
  findMatchingEventIds(
    query: string,
    events: SearchableEvent[],
    history: ChatMessage[],
    user?: UserContext,
  ): Promise<number[]>;
}
