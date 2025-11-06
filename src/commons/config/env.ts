import { cleanEnv, str, url, port, makeValidator } from "envalid";

const twilioSid = makeValidator<string>((v) => {
  if (!/^AC[0-9a-f]{32}$/i.test(v)) throw new Error("TWILIO_SID must look like AC + 32 hex chars");
  return v;
});

const whatsappSandboxNumber = makeValidator<string>((v) => {
  if (!/^whatsapp:\+\d{7,15}$/.test(v))
    throw new Error("TWILIO_SANDBOX_NUMBER must be whatsapp:+<E.164>");
  return v;
});

export const env = cleanEnv(Bun.env, {
  BASE_URL: url(),
  DATABASE_URL: url(),
  REDIS_URL: url(),
  PORT: port({ default: 3000 }),
  LOG_LEVEL: str({ default: "info" }),
  NODE_ENV: str({ choices: ["development", "production", "test"] }),

  WA_PHONE_NUMBER_ID: str(),
  WA_ACCESS_TOKEN: str(),
  WA_VERIFY_TOKEN: str(),
  WA_APP_SECRET: str(),
  WHATSAPP_PROVIDER: str({
    choices: ["baileys", "twilio"],
    default: "baileys",
  }),
  WA_BAILEYS_AUTH_DIR: str({ default: ".data/baileys-session" }),
  WA_SERVICE_NUMBER: str({ default: "" }),

  TWILIO_SID: twilioSid(),
  TWILIO_AUTH_TOKEN: str(),
  TWILIO_SANDBOX_NUMBER: whatsappSandboxNumber(),
});
