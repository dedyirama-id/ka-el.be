import type { Cradle } from "@/infrastructure/container";
import { Hono } from "hono";
import { WebhookController } from "./controller";

export const makeWebhookRoutes = (deps: Cradle) => {
  const app = new Hono();
  const controller = new WebhookController(deps);

  app.post("/webhook/wa", controller.receiveWaMessage);

  return app;
};
