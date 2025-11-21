import z from "zod";

export const parsedSearchQueriesSchema = z.object({
  queries: z
    .array(z.string())
    .describe("Extracted keywords for search queries. One word for one query"),
});

export type ParsedTagsDto = z.infer<typeof parsedSearchQueriesSchema>;
