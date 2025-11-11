import type { ReceiveWaMessageUsecase } from "@/application/usecases/ReceiveWaMessageUsecase";
import type { ReplyGeneralWaMessageUsecase } from "@/application/usecases/ReplyGeneralWaMessageUsecase";
import type { ReplyKaelWaMessageUsecase } from "@/application/usecases/ReplyKaelWaMessageUsecase";
import type { ReplyPingWaMessageUsecase } from "@/application/usecases/ReplyPingWaMessageUsecase";
import type { ReplyRegisterWaMessageUsecase } from "@/application/usecases/ReplyRegisterWaMessageUsecase";
import { env } from "@/commons/config/env";
import { ReceiveWaSchema } from "@/interface/validators/ReceiveWaSchema";
import type { FormDataEntryValue } from "bun";
import type { Context } from "hono";
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

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
    const formBody = await c.req.parseBody();
    if (env.WHATSAPP_PROVIDER === "twilio") {
      const isValid = this.verifyTwilioSignature(c, formBody);
      if (!isValid) {
        return c.text("Invalid Twilio signature", 403);
      }
    }

    const payload = ReceiveWaSchema.parse({ from: formBody.From, body: formBody.Body });

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
        await this.deps.replyGeneralWaMessageUsecase.execute(payload.from);
        break;
    }
    return c.text("OK");
  }

  private verifyTwilioSignature(c: Context, params: Record<string, FormDataEntryValue>): boolean {
    const signature = c.req.header("x-twilio-signature");
    if (!signature || !env.TWILIO_AUTH_TOKEN) {
      return false;
    }

    const expected = this.buildTwilioSignature(c, params);

    try {
      const providedBuf = Buffer.from(signature, "base64");
      const expectedBuf = Buffer.from(expected, "base64");
      return providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  private buildTwilioSignature(c: Context, params: Record<string, FormDataEntryValue>): string {
    const url = new URL(c.req.url);
    let payload = url.toString();

    const keys = Object.keys(params).sort();
    for (const key of keys) {
      const value = params[key];
      if (typeof value === "string") {
        payload += key + value;
      }
    }

    return createHmac("sha1", env.TWILIO_AUTH_TOKEN).update(payload).digest("base64");
  }
}
