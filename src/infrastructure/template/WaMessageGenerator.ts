import type { Event } from "@/domain/entities/Event";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import dayjs from "dayjs";

export class WaMessageGenerator implements MessageGenerator {
  generateWellcomeMessage(): string {
    return [
      "📚 *SELAMAT DATANG DI KA'EL* 📚",
      "> Saat ini anda berinteraksi dengan AI. ",
      "",
      "Ka'el adalah layanan cerdas berbasis AI yang akan membantu kamu menemukan berbagai event, lomba, magang, hingga pendanaan yang sesuai dengan minat dan profilmu.\n",
      "Temukan peluang pengembangan diri dengan cara yang lebih mudah, cepat, dan personal!",
      "",
      "1. Untuk mendaftar, kirimkan pesan: `@register <nama>`",
      "2. Untuk mengisi profil kamu, kirimkan pesan:  `@profile <deskripsi diri>`",
      "3. Untuk mencari event, jelaskan event yang ingin kamu cari, misal: `Saya mencari lomba programming`",
    ].join("\n");
  }
  generateNewEventMessage(event: Event): string {
    return [
      `> ✅ New Event Created!`,
      ``,
      `*Title:* ${event.title}`,
      `*Description:* ${event.description}`,
      `*Organizer:* ${event.organizer}`,
      `*Price:* ${event.priceMax - event.priceMin == 0 ? "Free" : `${event.priceMin} - ${event.priceMax}`}`,
      `*Start Date:* ${dayjs(event.startDate).format("D MMMM YYYY")}`,
      `*End Date:* ${dayjs(event.endDate).format("D MMMM YYYY")}`,
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
      `📅 ${dayjs(event.startDate).format("D MMMM YYYY")} - ${dayjs(event.endDate).format("D MMMM YYYY")}`,
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
      `> 📌 Pastikan kamu memperbarui profile agar Ka'el dapat memberikan rekomendasi lomba yang sesuai dengan minatmu secara otomatis!`,
      `> Kirimkan pesan \`@profile <deskripsi diri>\``,
      `> Contoh: \`@profile mahasiswa sistem informasi ITS, saya tertarik dengan bisnis dan data. Saya ingin mengikuti lomba dan sedang mencari peluang beasiswa ke luar negeri.\``,
    ].join("\n");
  }

  generateEventMessage(event: Event): string {
    return [
      `> #${event.id}`,
      ``,
      `*${event.title}*`,
      `${event.description}`,
      `💵 ${event.priceMax - event.priceMin == 0 ? "Free" : `Rp${event.priceMin} - Rp${event.priceMax}`}`,
      `📅 ${dayjs(event.startDate).format("D MMMM YYYY")} - ${dayjs(event.endDate).format("D MMMM YYYY")}`,
      `🔗 ${event.url ?? "N/A"}`,
      `${event.tags.map((tag) => `\`${tag.name}\``).join(", ")}`,
    ]
      .join("\n")
      .trim();
  }
  generateProfileUpdateMessage(name: string, profile: string, tags: string[]): string {
    return [
      `Okey, Saya sudah memperbarui profilemu! Saya akan memberikan notifikasi lomba yang sesuai dengan minatmu, ${name}.`,
      "",
      `> ${profile}`,
      `> ${tags.map((tag) => `\`${tag}\``).join(", ")}`,
    ].join("\n");
  }
}
