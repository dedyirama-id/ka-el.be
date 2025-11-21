import { z } from "zod";

export const ReceiveWaSchema = z.object({
  from: z
    .string()
    .nonempty()
    .regex(/^\+\d{10,20}$/, "Invalid format"),
  to: z
    .string()
    .nonempty()
    .regex(/^\+\d{10,20}$/, "Invalid format"),
  text: z.string().nonempty(),
  chatType: z.enum(["personal", "group"]),
  participant: z
    .string()
    .regex(/^\+\d{10,20}$/, "Invalid format")
    .optional(),
});
