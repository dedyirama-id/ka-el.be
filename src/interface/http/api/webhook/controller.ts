import type { ReceiveWaMessageUsecase } from "@/application/usecases/ReceiveWaMessageUsecase";
import type { ReplyGeneralWaMessageUsecase } from "@/application/usecases/ReplyGeneralWaMessageUsecase";
import type { ReplyKaelWaMessageUsecase } from "@/application/usecases/ReplyKaelWaMessageUsecase";
import type { ReplyPingWaMessageUsecase } from "@/application/usecases/ReplyPingWaMessageUsecase";
import type { ReplyRegisterWaMessageUsecase } from "@/application/usecases/ReplyRegisterWaMessageUsecase";
import { ReceiveWaSchema } from "@/interface/validators/ReceiveWaSchema";
import type { Context } from "hono";

type Deps = {
  receiveWaMessageUsecase: ReceiveWaMessageUsecase;
  replyPingWaMessageUsecase: ReplyPingWaMessageUsecase;
  replyGeneralWaMessageUsecase: ReplyGeneralWaMessageUsecase;
  replyKaelWaMessageUsecase: ReplyKaelWaMessageUsecase;
  replyRegisterWaMessageUsecase: ReplyRegisterWaMessageUsecase;
};

export class WebhookController {
  constructor(private readonly deps: Deps) {
    this.receiveWaMessage = this.receiveWaMessage.bind(this);
  }

  async receiveWaMessage(c: Context) {
    const req = await c.req.parseBody();
    const payload = ReceiveWaSchema.parse({ from: req.From, body: req.Body });

    const message = await this.deps.receiveWaMessageUsecase.execute(payload);

    switch (message.intent) {
      case "@ping":
        await this.deps.replyPingWaMessageUsecase.execute(payload.from);
        break;
      case "@kael":
        await this.deps.replyKaelWaMessageUsecase.execute(payload.from);
        break;
      case "@register":
        await this.deps.replyRegisterWaMessageUsecase.execute(message.from, message.value);
        break;
      default:
        break;
    }
    return c.text("OK");
  }
}
