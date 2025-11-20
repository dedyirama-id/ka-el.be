import type { Event } from "@/domain/entities/Event";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";

export class WaMessageGenerator implements MessageGenerator {
  generateNewEventMessage(event: Event): string {
    return [
      `*New Event Created!*`,
      `+--------------------------------------------------+`,
      `*Title:* ${event.title}`,
      `*Description:* ${event.description}`,
      `*Organizer:* ${event.organizer}`,
      `*Price:* ${event.priceMax - event.priceMin == 0 ? "Free" : `${event.priceMin} - ${event.priceMax}`}`,
      `*Start Date:* ${event.startDate.toDateString()}`,
      `*End Date:* ${event.endDate.toDateString()}`,
      `*Certificate* ${event.hasCertificate ? "Yes" : "No"}`,
      `*URL:* ${event.url ?? "N/A"}`,
      `*Tags:* ${event.tags.map((tag) => `\`${tag.name}\``).join(", ")}`,
    ]
      .join("\n")
      .trim();
  }
}
