import type { Event } from "../entities/Event";

export interface MessageGenerator {
  generateNewEventMessage(event: Event): string;
  generateNewEventNotificationMessage(event: Event): string;
}
