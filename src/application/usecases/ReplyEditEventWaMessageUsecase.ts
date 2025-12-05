import { Event } from "@/domain/entities/Event";
import type { WaMessage } from "@/domain/entities/WaMessage";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import { logger } from "@/commons/logger";
import { replyToUser } from "./utils/messageReply";

type Deps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  userRepository: UserRepository;
  idGenerator: IdGeneratorService;
  eventRepository: EventRepository;
  messageGenerator: MessageGenerator;
};

type ParsedPayload = {
  id: number | null;
  updates: Partial<{
    title: string;
    slug: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    url: string | null;
    priceMin: number;
    priceMax: number;
    hasCertificate: boolean;
    raw: string | null;
  }>;
  rawPayload: string;
  errors: string[];
};

export class ReplyEditEventWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<boolean> {
    try {
      const user = await this.deps.userRepository.findByPhone(message.from);
      if (!user) {
        await this.reply(
          message,
          "Fitur ini hanya dapat diakses oleh admin yang terdaftar. Silakan daftar dan hubungi admin untuk mendapatkan akses.",
          false,
        );
        return false;
      }
      if (!user.isLoggedIn()) {
        await this.reply(
          message,
          "Fitur ini hanya dapat diakses oleh admin yang sudah login. Silakan login terlebih dahulu.",
        );
        return false;
      }
      if (!user.isAdmin()) {
        await this.reply(message, "Maaf, hanya admin yang dapat menggunakan perintah @edit_event.");
        return false;
      }

      const requestedId = this.extractRequestedId(message.text);
      if (requestedId !== null) {
        const event = await this.deps.eventRepository.findById(requestedId);
        if (!event) {
          await this.reply(message, `Event dengan id \`${requestedId}\` tidak ditemukan.`);
          return false;
        }
        await this.reply(message, this.formatExistingEventPayload(event));
        return true;
      }

      const parsed = this.parsePayload(message.text);
      if (!parsed.id) {
        await this.reply(
          message,
          "Gunakan format berikut untuk mengedit event: `@edit_event <id>`",
        );
        return false;
      }

      if (parsed.errors.length > 0) {
        const response = [
          "Format edit event tidak valid:",
          ...parsed.errors.map((err) => `- ${err}`),
          "",
          ...this.formatHint(),
        ].join("\n");
        await this.reply(message, response);
        return false;
      }

      const updateKeys = Object.keys(parsed.updates);
      if (updateKeys.length === 0) {
        await this.reply(
          message,
          [
            "Tidak ada kolom yang dapat diperbarui. Sertakan setidaknya satu kolom.",
            ...this.formatHint(),
          ].join("\n"),
        );
        return false;
      }

      const event = await this.deps.eventRepository.findById(parsed.id);
      if (!event) {
        await this.reply(message, `Event dengan id \`${parsed.id}\` tidak ditemukan.`);
        return false;
      }

      let updatedEvent: Event;
      try {
        updatedEvent = Event.fromPersistence({
          ...event.toProps(),
          ...parsed.updates,
          raw: parsed.rawPayload || event.raw,
          updatedAt: new Date(),
        });
      } catch (error) {
        await this.reply(
          message,
          `Gagal memperbarui event karena data tidak valid: ${(error as Error).message}`,
        );
        return false;
      }

      const savedEvent = await this.deps.eventRepository.save(updatedEvent);
      const details = this.deps.messageGenerator.generateEventMessage(savedEvent);
      const content = [`✅ Event #${savedEvent.id} berhasil diperbarui.`, details].join("\n\n");
      await replyToUser(this.deps, message, content);
      return true;
    } catch (error) {
      logger.error("Failed to process edit_event command", { error, from: message.from });
      await this.reply(
        message,
        "Maaf, terjadi kesalahan saat memperbarui event. Coba lagi sebentar lagi ya.",
        false,
      );
      return false;
    }
  }

  private parsePayload(rawText: string): ParsedPayload {
    const withoutIntent = rawText.replace(/^@edit_event\b/i, "").trim();
    const lines = withoutIntent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line !== "---");

    const updates: ParsedPayload["updates"] = {};
    const errors: string[] = [];
    let id: number | null = null;

    if (lines.length === 0) {
      errors.push("Data baru belum diisi.");
    }

    for (const line of lines) {
      const hasColon = line.includes(":");
      const [rawKey, ...rawValueParts] = line.split(":");
      const key = rawKey?.trim().toLowerCase();
      const rawValue = rawValueParts.join(":").trim();

      switch (key) {
        case "id": {
          if (!rawValue) {
            errors.push("Nilai id tidak boleh kosong.");
            break;
          }
          const parsedId = Number(rawValue);
          if (!Number.isInteger(parsedId) || parsedId <= 0) {
            errors.push("id harus berupa angka bulat lebih dari 0.");
          } else {
            id = parsedId;
          }
          break;
        }
        case "title": {
          if (!rawValue) {
            errors.push("title tidak boleh kosong.");
            break;
          }
          updates.title = rawValue;
          break;
        }
        case "slug": {
          if (!rawValue) {
            errors.push("slug tidak boleh kosong.");
            break;
          }
          updates.slug = rawValue;
          break;
        }
        case "description": {
          updates.description = rawValue || null;
          break;
        }
        case "startdate": {
          const parsedDate = this.parseDate(rawValue, "startDate", errors);
          if (parsedDate) {
            updates.startDate = parsedDate;
          }
          break;
        }
        case "enddate": {
          const parsedDate = this.parseDate(rawValue, "endDate", errors);
          if (parsedDate) {
            updates.endDate = parsedDate;
          }
          break;
        }
        case "url": {
          updates.url = rawValue || null;
          break;
        }
        case "pricemin": {
          const parsedNumber = this.parseNumber(rawValue, "priceMin", errors);
          if (parsedNumber !== undefined) {
            updates.priceMin = parsedNumber;
          }
          break;
        }
        case "pricemax": {
          const parsedNumber = this.parseNumber(rawValue, "priceMax", errors);
          if (parsedNumber !== undefined) {
            updates.priceMax = parsedNumber;
          }
          break;
        }
        case "hascertificate": {
          const boolValue = this.parseBoolean(hasColon ? rawValue : null);
          if (boolValue === undefined) {
            errors.push("hasCertificate harus bernilai true/false (contoh: hasCertificate: true).");
          } else {
            updates.hasCertificate = boolValue;
          }
          break;
        }
        default: {
          if (key) {
            errors.push(`Kolom "${rawKey?.trim()}" tidak dikenal.`);
          }
        }
      }
    }

    return { id, updates, rawPayload: withoutIntent, errors };
  }

  private parseNumber(value: string, field: string, errors: string[]): number | undefined {
    if (!value) {
      errors.push(`${field} tidak boleh kosong.`);
      return undefined;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      errors.push(`${field} harus berupa angka.`);
      return undefined;
    }

    return parsed;
  }

  private parseDate(value: string, field: string, errors: string[]): Date | undefined {
    if (!value) {
      errors.push(`${field} tidak boleh kosong.`);
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      errors.push(`${field} harus berupa tanggal yang valid (contoh: 2025-01-01).`);
      return undefined;
    }

    return parsed;
  }

  private parseBoolean(value: string | null): boolean | undefined {
    if (value === null || value === "") return true;
    const normalized = value.toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "0"].includes(normalized)) return false;
    return undefined;
  }

  private extractRequestedId(text: string): number | null {
    const match = text.trim().match(/^@edit_event\s+(\d+)\s*$/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isInteger(parsed) ? parsed : null;
  }

  private formatExistingEventPayload(event: Event): string {
    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    return [
      "@edit_event",
      "",
      `id: ${event.id ?? ""}`,
      `title: ${event.title}`,
      `slug: ${event.slug}`,
      `description: ${event.description ?? ""}`,
      `startDate: ${formatDate(event.startDate)}`,
      `endDate: ${formatDate(event.endDate)}`,
      `url: ${event.url ?? ""}`,
      `priceMin: ${event.priceMin ?? ""}`,
      `priceMax: ${event.priceMax ?? ""}`,
      `hasCertificate: ${event.hasCertificate}`,
    ].join("\n");
  }

  private async reply(message: WaMessage, content: string, saveHistory = true) {
    await replyToUser(this.deps, message, content, { save: saveHistory });
  }

  private formatHint(): string[] {
    return [
      "@edit_event",
      "id: 1",
      "title: Judul baru",
      "slug: judul-baru",
      "description: Deskripsi singkat",
      "startDate: 2025-01-01",
      "endDate: 2025-01-02",
      "url: https://contoh.link",
      "priceMin: 0",
      "priceMax: 50000",
      "hasCertificate: true",
    ];
  }
}
