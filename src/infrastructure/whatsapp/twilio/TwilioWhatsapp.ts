import type { WhatsAppMessenger } from "@/application/ports/WhatsappMessenger";
import { env } from "@/commons/config/env";
import { MessageSent } from "@/domain/entities/MessageSent";

type WhatsAppTextMessage = { to: string; body: string };

export class TwilioWhatsapp implements WhatsAppMessenger {
  async sendText(msg: WhatsAppTextMessage): Promise<MessageSent> {
    const creds = Buffer.from(`${env.TWILIO_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");

    const form = new URLSearchParams();
    form.set("From", env.TWILIO_SANDBOX_NUMBER);
    const to = msg.to.startsWith("whatsapp:") ? msg.to : `whatsapp:${msg.to}`;
    form.set("To", to);
    form.set("Body", msg.body);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${creds}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      },
    );

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      throw new Error(`Twilio WA error: ${response.status} ${err}`);
    }

    return new MessageSent("", "");
  }

  async waitUntilReady(): Promise<void> {
    // Twilio uses webhooks; no connection handshake required.
  }
}
