import z from "zod";

export const parsedEventSearchResultSchema = z.object({
  eventIds: z
    .array(z.number().int())
    .describe(
      "IDs from the provided list that best match the user's search query, ordered by relevance. Use an empty array if nothing fits.",
    ),
});

export type ParsedEventSearchResultDto = z.infer<typeof parsedEventSearchResultSchema>;
