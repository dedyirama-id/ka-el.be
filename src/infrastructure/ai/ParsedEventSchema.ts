import z from "zod";

export const parsedEventSchema = z
  .object({
    title: z
      .string()
      .describe(
        "The full title of the event or opportunity (e.g., 'Beginner Data Science Webinar').",
      ),

    slug: z
      .string()
      .optional()
      .describe(
        "A unique URL-friendly slug for the event. If not provided, it can be auto-generated from the title.",
      ),

    description: z
      .string()
      .nullable()
      .optional()
      .describe(
        "A concise description summarizing the event’s purpose, topics, and key highlights.",
      ),

    organizer: z
      .string()
      .optional()
      .describe(
        "The name of the event organizer (company, community, university, or institution).",
      ),

    url: z.string().nullable().optional().describe("Event information link."),

    startDate: z
      .string()
      .describe(
        'Event start date and time in ISO 8601 format (e.g., "2025-11-20T19:00:00+07:00").',
      ),

    endDate: z
      .string()
      .describe('Event end date and time in ISO 8601 format (e.g., "2025-11-20T21:00:00+07:00").'),

    isFree: z
      .boolean()
      .describe("Indicates whether the event is free to join (true) or paid (false)."),

    priceMin: z
      .number()
      .describe(
        "Minimum ticket price. Null if the event is free or no price information is provided.",
      ),

    priceMax: z
      .number()
      .describe(
        "Maximum ticket price, used when a price range exists (e.g., early-bird vs regular). Null if not applicable.",
      ),

    hasCertificate: z
      .boolean()
      .optional()
      .describe("Indicates whether the event provides a certificate of participation."),

    raw: z.string().describe("The raw information before event being parsed"),
    tags: z.array(z.string()).describe("Tags or keywordsof the event."),
  })
  .describe("Schema for structured event data extracted by Ka'el from user-submitted messages.");

export type ParsedEventDto = z.infer<typeof parsedEventSchema>;
