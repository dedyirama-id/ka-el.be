import z from "zod";

export const intentSchema = z
  .enum(["add_event", "search_event", "general"])
  .describe(
    "The identified intent of the user's message, e.g. 'add_event'. If no specific intent is detected, use 'general'.",
  );

export const parsedIntentSchema = z.object({
  intent: intentSchema,
  value: z.string().describe("Extracted content associated with the intent."),
  raw: z.string().describe("Original message from the user before processing."),
});

export const INTENT_DESCRIPTIONS: Record<z.infer<typeof intentSchema>, string> = {
  add_event: "User wants to add a new event.",
  search_event: "User wants to search event.",
  general: "General message without a specific intent.",
};

export type ParsedIntentDto = z.infer<typeof parsedIntentSchema>;
