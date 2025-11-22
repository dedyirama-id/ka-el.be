import type { Event } from "../entities/Event";

export interface MessageGenerator {
  generateWellcomeMessage(): string;
  generateNewEventMessage(event: Event): string;
  generateNewEventNotificationMessage(event: Event): string;
  generateOnboardingMessage(name: string): string;
  generateEventMessage(event: Event): string;
  generateProfileUpdateMessage(name: string, profile: string, tags: string[]): string;
}
