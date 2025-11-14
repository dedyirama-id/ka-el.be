import type { PrismaClient } from "@prisma/client";
import type { TransactionManager } from "@/application/ports/TransactionManager";
import type { WhatsAppMessenger } from "@/application/ports/WhatsappMessenger";
import { ReceiveWaMessageUsecase } from "@/application/usecases/ReceiveWaMessageUsecase";
import { ReplyGeneralWaMessageUsecase } from "@/application/usecases/ReplyGeneralWaMessageUsecase";
import { ReplyPingWaMessageUsecase } from "@/application/usecases/ReplyPingWaMessageUsecase";
import { env } from "@/commons/config/env";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import type { AIService } from "@/domain/Services/AIService";
import {
  type AwilixContainer,
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
} from "awilix";
import { prisma } from "./persistence/prisma";
import { PrismaMessageRepository } from "./persistence/prisma/MessageRepository";
import { PrismaTransactionManager } from "./persistence/prisma/TransactionManager";
import { PrismaUserRepository } from "./persistence/prisma/UserRepository";
import { IdGenerator } from "./security/IdGenerator";
import { BaileysWhatsapp } from "./whatsapp/baileys/BaileysWhatsapp";
import { TwilioWhatsapp } from "./whatsapp/twilio/TwilioWhatsapp";
import { WhatsappServiceAdapter } from "./whatsapp/WhatsappServiceAdapter";
import { ReplyKaelWaMessageUsecase } from "@/application/usecases/ReplyKaelWaMessageUsecase";
import { ReplyRegisterWaMessageUsecase } from "@/application/usecases/ReplyRegisterWaMessageUsecase";
import { GeminiAIService } from "./ai/gemini/GeminiAIService";

export interface Cradle {
  prisma: PrismaClient;
  tx: TransactionManager;
  waServiceNumber: string;
  waLinkTtlMs: number;
  whatsappMessenger: WhatsAppMessenger;
  whatsappService: WhatsappService;
  aiService: AIService;
  userRepository: UserRepository;
  idGenerator: IdGenerator;
  replyGeneralWaMessageUsecase: ReplyGeneralWaMessageUsecase;
  messageRepository: MessageRepository;
  receiveWaMessageUsecase: ReceiveWaMessageUsecase;
  replyPingWaMessageUsecase: ReplyPingWaMessageUsecase;
  replyKaelWaMessageUsecase: ReplyKaelWaMessageUsecase;
  replyRegisterWaMessageUsecase: ReplyRegisterWaMessageUsecase;
}

const container: AwilixContainer<Cradle> = createContainer<Cradle>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

container.register({
  // Config
  waServiceNumber: asValue(env.WA_SERVICE_NUMBER || env.TWILIO_SANDBOX_NUMBER || ""),
  waLinkTtlMs: asValue(15 * 60 * 1000 /* 15 min */),

  // Service
  whatsappMessenger: asFunction(() => {
    if (env.WHATSAPP_PROVIDER === "twilio") {
      return new TwilioWhatsapp();
    }

    return new BaileysWhatsapp({
      authDir: env.WA_BAILEYS_AUTH_DIR,
    });
  }).singleton(),
  whatsappService: asFunction(
    ({ whatsappMessenger }) => new WhatsappServiceAdapter(whatsappMessenger),
  ).singleton(),
  aiService: asClass(GeminiAIService).singleton(),
  idGenerator: asClass(IdGenerator).singleton(),

  // Repository
  prisma: asValue(prisma),
  tx: asFunction(({ prisma: db }) => new PrismaTransactionManager(db)).singleton(),
  userRepository: asFunction(({ prisma: db }) => new PrismaUserRepository(db)).singleton(),
  messageRepository: asFunction(({ prisma: db }) => new PrismaMessageRepository(db)).singleton(),

  // Usecase
  replyGeneralWaMessageUsecase: asClass(ReplyGeneralWaMessageUsecase).singleton(),
  receiveWaMessageUsecase: asClass(ReceiveWaMessageUsecase).singleton(),
  replyPingWaMessageUsecase: asClass(ReplyPingWaMessageUsecase).singleton(),
  replyKaelWaMessageUsecase: asClass(ReplyKaelWaMessageUsecase).singleton(),
  replyRegisterWaMessageUsecase: asClass(ReplyRegisterWaMessageUsecase).singleton(),
});

export default container;
