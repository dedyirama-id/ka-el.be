import type { Event } from "../entities/Event";

export interface AIService {
  replyGeneralMessage(message: string): Promise<string>;
  proofreadingMessage(message: string): Promise<string>;
  parseEvent(message: string): Promise<Event>;
}
