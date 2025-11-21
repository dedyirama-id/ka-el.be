import { env } from "@/commons/config/env";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import container from "./infrastructure/container";
import { createServer } from "./infrastructure/http/createServer";

const argv = process.argv.slice(2);
const PRINT_QR_FLAG = "--print-wa-qr";

if (argv.includes(PRINT_QR_FLAG)) {
  const exitCode = await runQrPrinter();
  process.exit(exitCode);
}

const app = createServer(container);

// Start WhatsApp service on boot so Baileys connects and logs status.
void bootstrapWhatsapp();

export default {
  port: env.PORT,
  fetch: app.fetch,
};

function bootstrapWhatsapp() {
  try {
    const service = container.resolve<WhatsappService>("whatsappService");
    const qrCapable = service as { waitUntilReady?: () => Promise<void> };
    if (qrCapable.waitUntilReady) {
      qrCapable.waitUntilReady().catch((err) => {
        console.error("WhatsApp service failed to become ready", err);
      });
    }
  } catch (err) {
    console.error("Failed to initialise WhatsApp service", err);
  }
}

async function runQrPrinter(): Promise<number> {
  let messenger: WhatsappService;
  try {
    messenger = container.resolve<WhatsappService>("whatsappService");
  } catch (err) {
    console.error("Failed to initialise WhatsApp messenger", err);
    return 1;
  }

  const qrCapable = messenger as { waitUntilReady?: () => Promise<void> };
  if (typeof qrCapable.waitUntilReady !== "function") {
    console.warn("Active WhatsApp provider does not support QR code generation.");
    return 0;
  }

  console.log("Menunggu WhatsApp menampilkan QR code...");
  try {
    await qrCapable.waitUntilReady();
    console.log("WhatsApp berhasil terhubung. Proses bisa dihentikan.");
    return 0;
  } catch (err) {
    console.error("WhatsApp messenger gagal siap digunakan", err);
    return 1;
  }
}
