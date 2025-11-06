import type { WhatsAppMessenger } from "@/application/ports/WhatsappMessenger";
import { env } from "@/commons/config/env";
import container from "./infrastructure/container";
import { createServer } from "./infrastructure/http/createServer";

const argv = process.argv.slice(2);
const PRINT_QR_FLAG = "--print-wa-qr";

if (argv.includes(PRINT_QR_FLAG)) {
  const exitCode = await runQrPrinter();
  process.exit(exitCode);
}

try {
  container.resolve<WhatsAppMessenger>(`whatsappMessenger`);
} catch (err) {
  console.error("Failed to initialise WhatsApp messenger", err);
}

const app = createServer(container);
export default {
  port: env.PORT,
  fetch: app.fetch,
};

async function runQrPrinter(): Promise<number> {
  let messenger: WhatsAppMessenger;
  try {
    messenger = container.resolve<WhatsAppMessenger>("whatsappMessenger");
  } catch (err) {
    console.error("Failed to initialise WhatsApp messenger", err);
    return 1;
  }

  if (typeof messenger.waitUntilReady !== "function") {
    console.warn("Active WhatsApp provider does not support QR code generation.");
    return 0;
  }

  console.log("Menunggu WhatsApp menampilkan QR code...");
  try {
    await messenger.waitUntilReady();
    console.log("WhatsApp berhasil terhubung. Proses bisa dihentikan.");
    return 0;
  } catch (err) {
    console.error("WhatsApp messenger gagal siap digunakan", err);
    return 1;
  }
}
