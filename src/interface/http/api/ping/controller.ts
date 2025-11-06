import type { Context } from "hono";

export class Controller {
  constructor() {
    this.ping = this.ping.bind(this);
  }

  async ping(c: Context) {
    return c.json(
      {
        status: true,
        data: {
          message: "pong",
        },
      },
      200,
    );
  }
}
