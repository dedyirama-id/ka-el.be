import { logger } from "@/commons/logger";
import { makeWebhookRoutes } from "@/interface/http/api/webhook";
import type { AwilixContainer } from "awilix";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Cradle } from "../container";
import { ClientError } from "@/commons/exceptions/ClientError";
import { makePingRoutes } from "@/interface/http/api/ping";

export function createServer(container: AwilixContainer<Cradle>) {
  const app = new Hono();
  app.use(cors());

  app.route("/api", makePingRoutes());
  app.route("/api", makeWebhookRoutes(container.cradle));

  app.onError((err, c) => {
    if (err instanceof ClientError) {
      logger.warn(err);
      return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
    }

    logger.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  });

  return app;
}
