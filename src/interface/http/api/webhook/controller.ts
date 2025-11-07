import type { ReceiveWaMessageUsecase } from "@/application/usecases/ReceiveWaMessageUsecase";
import type { ReplyGeneralWaMessageUsecase } from "@/application/usecases/ReplyGeneralWaMessageUsecase";
import type { ReplyPingWaMessageUsecase } from "@/application/usecases/ReplyPingWaMessageUsecase";
import { ReceiveWaSchema } from "@/interface/validators/ReceiveWaSchema";
import type { Context } from "hono";

type Deps = {
  receiveWaMessageUsecase: ReceiveWaMessageUsecase;
  replyPingWaMessageUsecase: ReplyPingWaMessageUsecase;
  replyGeneralWaMessageUsecase: ReplyGeneralWaMessageUsecase;
};

export class WebhookController {
  constructor(private readonly deps: Deps) {
    this.receiveWaMessage = this.receiveWaMessage.bind(this);
  }

  async receiveWaMessage(c: Context) {
    const req = await c.req.parseBody();
    const payload = ReceiveWaSchema.parse({ from: req.From, body: req.Body });

    switch (payload.body) {
      case "@ping":
        await this.deps.replyPingWaMessageUsecase.execute(payload.from);
        break;
      default:
        break;
    }
    return c.text("OK");
  }
}
