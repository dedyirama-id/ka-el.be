import { mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { env } from "@/commons/config/env";
import { logger } from "@/commons/logger";
import type { MessageSent } from "@/domain/entities/MessageSent";
import makeWASocket, {
  type BaileysEventMap,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type proto,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import qrcodeTerminal from "qrcode-terminal";
import type { Logger as WinstonLogger } from "winston";
import { URL } from "node:url";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import { maskNumber } from "@/commons/utils";
import type { ChatType } from "@/domain/value-objects/ChatType";

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

type BaileysWhatsappOptions = {
  authDir?: string;
  connectionTimeoutMs?: number;
  qrCallback?: (qr: string) => void;
};

export class BaileysWhatsapp implements WhatsappService {
  private socket?: WASocket;
  private initTask?: Promise<WASocket>;
  private connectionDeferred?: Deferred;
  private readonly authDir: string;
  private readonly logger: WinstonLogger;
  private readonly connectionTimeoutMs: number;
  private readonly qrCallback?: (qr: string) => void;
  private readonly webhookUrl: string;
  private lastShownQr?: string;
  private readonly onMessagesUpsert = (event: BaileysEventMap["messages.upsert"]) => {
    if (event.type !== "notify") return;
    const socket = this.socket;
    if (!socket) return;

    for (const msg of event.messages) {
      const fromJid = msg.key.remoteJid ?? "";
      if (!fromJid || msg.key.fromMe) continue;
      if (fromJid === "status@broadcast") continue;

      const toJid = socket.user?.id ?? "";

      const text = BaileysWhatsapp.extractText(msg.message);
      if (!text) continue;

      const participant = msg.key.participantAlt ?? undefined;

      void this.forwardToWebhook(fromJid, toJid, text, participant).catch((err) => {
        this.logger.error("Failed forwarding WhatsApp message to webhook", fromJid, err);
      });
    }
  };

  constructor(options: BaileysWhatsappOptions = {}) {
    this.connectionTimeoutMs = options.connectionTimeoutMs ?? 60_000;
    this.qrCallback = options.qrCallback;

    const configuredDir = options.authDir ?? join(".data", "baileys-session");
    this.authDir = isAbsolute(configuredDir) ? configuredDir : join(process.cwd(), configuredDir);
    mkdirSync(this.authDir, { recursive: true });

    this.logger = logger.child({ service: "BaileysWhatsapp" });
    const base = BaileysWhatsapp.ensureAbsoluteUrl(env.BASE_URL);
    this.webhookUrl = new URL("/api/webhook/wa", base).toString();

    void this.ensureSocket().catch((err) => {
      this.logger.error("Failed to initialise Baileys WhatsApp", { err });
    });
  }

  async sendToChat(to: string, text: string, chatType: ChatType): Promise<MessageSent> {
    if (chatType == "group") {
      logger.info("Cancel sending message to group");
      return { id: "", text: "" };
    }

    const socket = await this.ensureReadySocket();
    const jid = BaileysWhatsapp.toJid(to);
    const sent = await socket.sendMessage(jid, { text });
    const message = sent?.message ?? {};
    const key = sent?.key ?? {};

    logger.info("Message sent", { to: maskNumber(to) });

    return {
      id: key.id || "",
      text: BaileysWhatsapp.extractText(message) || "",
    };
  }

  async waitUntilReady(): Promise<void> {
    await this.ensureReadySocket();
  }

  private async ensureReadySocket(): Promise<WASocket> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.ensureSocket();
      try {
        await this.waitForConnection();
      } catch (err) {
        lastError = err;
        this.logger.warn("Baileys connection not ready yet, retrying once", {
          err,
        });
        continue;
      }

      const current = this.socket;
      if (current?.user) {
        return current;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Baileys WA error: connection unavailable");
  }

  private async ensureSocket(): Promise<WASocket> {
    if (this.socket) return this.socket;
    if (this.initTask) return this.initTask;

    this.initTask = this.createSocket()
      .then((sock) => {
        this.socket = sock;
        return sock;
      })
      .catch((err) => {
        this.initTask = undefined;
        this.socket = undefined;
        throw err;
      });

    return this.initTask;
  }

  private async createSocket(): Promise<WASocket> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    this.connectionDeferred = this.createDeferred();
    this.lastShownQr = undefined;

    const { version } = await fetchLatestBaileysVersion();
    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
    });

    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("messages.upsert", this.onMessagesUpsert);
    socket.ev.on("connection.update", (update) => this.handleConnectionUpdate(socket, update));

    return socket;
  }

  private handleConnectionUpdate(socket: WASocket, update: BaileysEventMap["connection.update"]) {
    if (update.qr && update.qr !== this.lastShownQr) {
      this.lastShownQr = update.qr;
      if (this.qrCallback) {
        this.qrCallback(update.qr);
      } else {
        qrcodeTerminal.generate(update.qr, { small: true });
      }
      this.logger.info("Scan the QR code above to authorise the WhatsApp session");
    }

    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      this.logger.info("Baileys WhatsApp connection ready");
      this.resolveConnection();
      return;
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
        ?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const err =
        lastDisconnect?.error instanceof Error
          ? lastDisconnect.error
          : new Error("Baileys connection closed unexpectedly");

      this.logger.warn("Baileys WhatsApp connection closed", {
        err,
        statusCode,
      });

      this.rejectConnection(err);
      this.cleanupSocket(socket);

      if (shouldReconnect) {
        void this.ensureSocket().catch((error) => {
          this.logger.error("Failed restarting Baileys WhatsApp connection", {
            err: error,
          });
        });
      }
    }
  }

  private async waitForConnection(): Promise<void> {
    if (this.socket?.user) return;

    const deferred = this.connectionDeferred;
    if (!deferred) {
      throw new Error("Baileys WA error: connection not initialised");
    }

    const timeout = this.connectionTimeoutMs;
    if (timeout <= 0) {
      await deferred.promise;
      return;
    }

    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        deferred.promise,
        new Promise<void>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Timed out waiting for Baileys connection after ${timeout}ms`));
          }, timeout);
        }),
      ]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  private resolveConnection() {
    this.connectionDeferred?.resolve();
    this.connectionDeferred = undefined;
  }

  private rejectConnection(err: Error) {
    this.connectionDeferred?.reject(err);
    this.connectionDeferred = undefined;
  }

  private cleanupSocket(socket: WASocket) {
    try {
      socket.ev.removeAllListeners("connection.update");
      socket.ev.removeAllListeners("creds.update");
      socket.ev.removeAllListeners("messages.upsert");
    } catch {
      // ignore cleanup errors
    }

    if (this.socket === socket) {
      this.socket = undefined;
    }

    this.initTask = undefined;
    this.lastShownQr = undefined;
  }

  private createDeferred(): Deferred {
    let resolve!: () => void;
    let reject!: (error: Error) => void;

    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  }

  private async forwardToWebhook(
    remoteJid: string,
    toJid: string,
    text: string,
    participant?: string,
  ) {
    const chatType = remoteJid.endsWith("@g.us") ? "group" : "personal";

    const from = remoteJid.replace(/@.+$/, "");
    const to = toJid.replace(/@.+$/, "").split(":")[0];
    const part = participant ? participant.replace(/@.+$/, "") : "";

    const body = new URLSearchParams();
    body.set("chatType", chatType);
    body.set("from", "+" + from);
    body.set("to", "+" + to);
    body.set("text", text);
    if (part) {
      body.set("participant", "+" + part);
    }

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      throw new Error(`Webhook responded with ${response.status} ${response.statusText}: ${err}`);
    }
  }

  private static extractText(message?: proto.IMessage | null): string | null {
    if (!message) return null;

    if (message.conversation) return message.conversation.trim();
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text.trim();
    if (message.imageMessage?.caption) return message.imageMessage.caption.trim();
    if (message.videoMessage?.caption) return message.videoMessage.caption.trim();
    if (message.ephemeralMessage?.message) {
      return BaileysWhatsapp.extractText(message.ephemeralMessage.message);
    }
    if (message.viewOnceMessage?.message) {
      return BaileysWhatsapp.extractText(message.viewOnceMessage.message);
    }
    if (message.documentMessage?.caption) return message.documentMessage.caption.trim();
    if (message.buttonsResponseMessage?.selectedDisplayText) {
      return message.buttonsResponseMessage.selectedDisplayText.trim();
    }
    if (message.listResponseMessage?.title) return message.listResponseMessage.title.trim();

    return null;
  }

  private static toJid(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("Baileys WA error: missing recipient");
    }

    if (trimmed.includes("@s.whatsapp.net") || trimmed.includes("@g.us")) {
      return trimmed;
    }

    const withoutPrefix = trimmed.replace(/^whatsapp:/i, "");
    const digits = withoutPrefix.replace(/\D/g, "");

    if (!digits) {
      throw new Error("Baileys WA error: invalid phone number");
    }

    return `${digits}@s.whatsapp.net`;
  }

  private static toGroupJid(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("Baileys WA error: missing recipient");
    }

    if (trimmed.includes("@s.whatsapp.net") || trimmed.includes("@g.us")) {
      return trimmed;
    }

    const withoutPrefix = trimmed.replace(/^whatsapp:/i, "");
    const digits = withoutPrefix.replace(/\D/g, "");

    if (!digits) {
      throw new Error("Baileys WA error: invalid phone number");
    }

    return `${digits}@g.us`;
  }

  private static ensureAbsoluteUrl(input: string): string {
    try {
      const parsed = new URL(input);
      return parsed.toString();
    } catch {
      const normalized = input.startsWith("//") ? `http:${input}` : `http://${input}`;
      return new URL(normalized).toString();
    }
  }
}
