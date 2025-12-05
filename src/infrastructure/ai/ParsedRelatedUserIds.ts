import z from "zod";

export const parsedRelatedUserIdsSchema = z.object({
  userIds: z
    .array(z.string().min(1))
    .describe(
      "IDs from the provided user list who are most likely interested in the event. Return an empty array if no one fits.",
    ),
});

export type ParsedRelatedUserIdsDto = z.infer<typeof parsedRelatedUserIdsSchema>;
