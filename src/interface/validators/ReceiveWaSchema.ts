import { z } from "zod";

export const ReceiveWaSchema = z.object({
  from: z.string().min(1).includes("whatsapp:"),
  body: z.string().min(1),
});
