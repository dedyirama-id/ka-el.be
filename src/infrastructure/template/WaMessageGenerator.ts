import type { Event } from "@/domain/entities/Event";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";

export class WaMessageGenerator implements MessageGenerator {
  generateNewEventMessage(event: Event): string {
    return [
      `+---------------------------------------------------+`,
      `                *New Event Created!*                `,
      `+---------------------------------------------------+`,
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

  generateNewEventNotificationMessage(event: Event): string {
    return [
      `*${event.title} by ${event.organizer}*`,
      `${event.description}`,
      `💵 ${event.priceMax - event.priceMin == 0 ? "Free" : `Rp${event.priceMin} - Rp${event.priceMax}`}`,
      `📅 ${event.startDate.toDateString()} - ${event.endDate.toDateString()}`,
      `🔗 ${event.url ?? "N/A"}`,
      `${event.tags.map((tag) => `\`${tag.name}\``).join(", ")}`,
    ]
      .join("\n")
      .trim();
  }

  generateOnboardingMessage(name: string): string {
    return [
      `*Selamat datang ${name}!*`,
      `Kamu sekarang dapat menggunakan layanan KA'EL. \n`,
      `> 📌 Pastikan kamu memperbarui profile agar Ka'el dapat memberikan rekomendasi lomba yang sesuai dengan minatmu!`,
      `> Kirimkan pesan \`@profile <deskripsi diri>\``,
    ].join("\n");
  }
}
