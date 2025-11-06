import { Hono } from "hono";
import { Controller } from "./controller";

export const makePingRoutes = () => {
  const app = new Hono();
  const controller = new Controller();

  app.get("/ping", controller.ping);

  return app;
};
