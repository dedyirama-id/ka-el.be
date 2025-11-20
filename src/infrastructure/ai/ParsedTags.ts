import z from "zod";

export const parsedTagsSchema = z.object({
  tags: z.array(z.string()).describe("Extracted tags associated with the content."),
});

export type ParsedTagsDto = z.infer<typeof parsedTagsSchema>;
