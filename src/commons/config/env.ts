import { cleanEnv, str, url, port, makeValidator } from "envalid";

const twilioSid = makeValidator<string>((v) => {
  if (!v) return "";
  if (!/^AC[0-9a-f]{32}$/i.test(v)) throw new Error("TWILIO_SID must look like AC + 32 hex chars");
  return v;
});

const whatsappSandboxNumber = makeValidator<string>((v) => {
  if (!v) return "";
  if (!/^whatsapp:\+\d{7,15}$/.test(v))
    throw new Error("TWILIO_SANDBOX_NUMBER must be whatsapp:+<E.164>");
  return v;
});

const optionalUrl = makeValidator<string>((v) => {
  if (!v) return "";
  try {
    return new URL(v).toString();
  } catch {
    throw new Error("Value must be a valid URL or empty string");
  }
});

export const env = cleanEnv(Bun.env, {
  BASE_URL: url(),
  DATABASE_URL: url(),
  REDIS_URL: optionalUrl({ default: "" }),
  PORT: port({ default: 3000 }),
  LOG_LEVEL: str({ default: "info" }),
  NODE_ENV: str({ choices: ["development", "production", "test"] }),

  WA_PHONE_NUMBER_ID: str({ default: "" }),
  WA_ACCESS_TOKEN: str({ default: "" }),
  WA_VERIFY_TOKEN: str({ default: "" }),
  WA_APP_SECRET: str({ default: "" }),
  WHATSAPP_PROVIDER: str({
    choices: ["baileys", "twilio"],
    default: "baileys",
  }),
  WA_BAILEYS_AUTH_DIR: str({ default: ".data/baileys-session" }),
  WA_SERVICE_NUMBER: str({ default: "" }),

  TWILIO_SID: twilioSid({ default: "" }),
  TWILIO_AUTH_TOKEN: str({ default: "" }),
  TWILIO_SANDBOX_NUMBER: whatsappSandboxNumber({ default: "" }),

  GEMINI_API_KEY: str(),
});
