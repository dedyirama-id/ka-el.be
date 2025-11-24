import type { ReceiveWaMessageUsecase } from "@/application/usecases/ReceiveWaMessageUsecase";
import type { ReplyGeneralWaMessageUsecase } from "@/application/usecases/ReplyGeneralWaMessageUsecase";
import type { ReplyKaelWaMessageUsecase } from "@/application/usecases/ReplyKaelWaMessageUsecase";
import type { ReplyPingWaMessageUsecase } from "@/application/usecases/ReplyPingWaMessageUsecase";
import type { ReplyRegisterWaMessageUsecase } from "@/application/usecases/ReplyRegisterWaMessageUsecase";
import type { ReplyProfileWaMessageUsecase } from "@/application/usecases/ReplyProfileWaMessageUsecase";
import { ReceiveWaSchema } from "@/interface/validators/ReceiveWaSchema";
import type { Context } from "hono";
import type { ReplyEventWaMessageUsecase } from "@/application/usecases/ReplyEventWaMessageUsecase";
import type { ReplySearchEventWaMessageUsecase } from "@/application/usecases/ReplySearchEventWaMessageUsecase";
import { WaMessage } from "@/domain/entities/WaMessage";
import type { ReplyLogoutWaMessageUsecase } from "@/application/usecases/ReplyLogoutWaMessageUsecase";
import type { ReplyLoginWaMessageUsecase } from "@/application/usecases/ReplyLoginWaMessageUsecase";
import { DeleteUserUseCase } from '../../../../application/usecases/DeleteUserUseCase';

type Deps = {
  receiveWaMessageUsecase: ReceiveWaMessageUsecase;
  replyPingWaMessageUsecase: ReplyPingWaMessageUsecase;
  replyGeneralWaMessageUsecase: ReplyGeneralWaMessageUsecase;
  replyKaelWaMessageUsecase: ReplyKaelWaMessageUsecase;
  replyRegisterWaMessageUsecase: ReplyRegisterWaMessageUsecase;
  replyProfileWaMessageUsecase: ReplyProfileWaMessageUsecase;
  replyEventWaMessageUsecase: ReplyEventWaMessageUsecase;
  replySearchEventWaMessageUsecase: ReplySearchEventWaMessageUsecase;
  replyLogoutWaMessageUsecase: ReplyLogoutWaMessageUsecase;
  replyLoginWaMessageUsecase: ReplyLoginWaMessageUsecase;
  deleteUserUseCase: DeleteUserUseCase;
};

export class WebhookController {
  constructor(private readonly deps: Deps) {
    this.receiveWaMessage = this.receiveWaMessage.bind(this);
  }

  async receiveWaMessage(c: Context) {
    const body = await c.req.parseBody();

    const payload = ReceiveWaSchema.parse(body);
    const message = await this.deps.receiveWaMessageUsecase.execute(new WaMessage(payload));

    switch (message.intent) {
      case "@ping":
        await this.deps.replyPingWaMessageUsecase.execute(message);
        break;
      case "@kael":
        await this.deps.replyKaelWaMessageUsecase.execute(message);
        break;
      case "@register":
        await this.deps.replyRegisterWaMessageUsecase.execute(message);
        break;
      case "@profile":
        await this.deps.replyProfileWaMessageUsecase.execute(message);
        break;
      case "@logout":
        await this.deps.replyLogoutWaMessageUsecase.execute(message);
        break;
      case "@login":
        await this.deps.replyLoginWaMessageUsecase.execute(message);
        break;
      case "@destroy":
        await this.deps.deleteUserUseCase.execute(message);
        break;
      case "add_event":
        await this.deps.replyEventWaMessageUsecase.execute(message);
        break;
      case "search_event":
        await this.deps.replySearchEventWaMessageUsecase.execute(message);
        break;
      default:
        await this.deps.replyGeneralWaMessageUsecase.execute(message);
        break;
    }
    return c.text("OK");
  }
}
