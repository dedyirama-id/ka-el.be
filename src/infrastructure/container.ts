import type { PrismaClient } from "@prisma/client";
import type { TransactionManager } from "@/application/ports/TransactionManager";
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
import { ReplyKaelWaMessageUsecase } from "@/application/usecases/ReplyKaelWaMessageUsecase";
import { ReplyRegisterWaMessageUsecase } from "@/application/usecases/ReplyRegisterWaMessageUsecase";
import { GeminiAIService } from "./ai/gemini/GeminiAIService";
import { ReplyProfileWaMessageUsecase } from "@/application/usecases/ReplyProfileWaMessageUsecase";
import { ReplyEventWaMessageUsecase } from "@/application/usecases/ReplyEventWaMessageUsecase";
import { PrismaEventRepository } from "./persistence/prisma/EventRepository";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import { PrismaTagRepository } from "./persistence/prisma/TagRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import { WaMessageGenerator } from "./template/WaMessageGenerator";
import { ReplySearchEventWaMessageUsecase } from "../application/usecases/ReplySearchEventWaMessageUsecase";
import { ReplyLogoutWaMessageUsecase } from "@/application/usecases/ReplyLogoutWaMessageUsecase";
import { ReplyLoginWaMessageUsecase } from "@/application/usecases/ReplyLoginWaMessageUsecase";
import { DeleteUserUseCase } from "@/application/usecases/DeleteUserUseCase";

export interface Cradle {
  prisma: PrismaClient;
  tx: TransactionManager;
  waServiceNumber: string;
  waLinkTtlMs: number;
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
  replyProfileWaMessageUsecase: ReplyProfileWaMessageUsecase;
  replyEventWaMessageUsecase: ReplyEventWaMessageUsecase;
  eventRepository: EventRepository;
  tagRepository: TagRepository;
  messageGenerator: MessageGenerator;
  replySearchEventWaMessageUsecase: ReplySearchEventWaMessageUsecase;
  replyLogoutWaMessageUsecase: ReplyLogoutWaMessageUsecase;
  replyLoginWaMessageUsecase: ReplyLoginWaMessageUsecase;
  deleteUserUseCase: DeleteUserUseCase;
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
  whatsappService: asClass(BaileysWhatsapp, {
    injector: () => ({
      authDir: env.WA_BAILEYS_AUTH_DIR,
      connectionTimeoutMs: 60_000,
      qrCallback: undefined,
    }),
  }).singleton(),
  aiService: asClass(GeminiAIService).singleton(),
  idGenerator: asClass(IdGenerator).singleton(),
  messageGenerator: asClass(WaMessageGenerator).singleton(),

  // Repository
  prisma: asValue(prisma),
  tx: asFunction(({ prisma: db }) => new PrismaTransactionManager(db)).singleton(),
  userRepository: asFunction(({ prisma: db }) => new PrismaUserRepository(db)).singleton(),
  messageRepository: asFunction(({ prisma: db }) => new PrismaMessageRepository(db)).singleton(),
  eventRepository: asFunction(({ prisma: db }) => new PrismaEventRepository(db)).singleton(),
  tagRepository: asFunction(({ prisma: db }) => new PrismaTagRepository(db)).singleton(),

  // Usecase
  replyGeneralWaMessageUsecase: asClass(ReplyGeneralWaMessageUsecase).singleton(),
  receiveWaMessageUsecase: asClass(ReceiveWaMessageUsecase).singleton(),
  replyPingWaMessageUsecase: asClass(ReplyPingWaMessageUsecase).singleton(),
  replyKaelWaMessageUsecase: asClass(ReplyKaelWaMessageUsecase).singleton(),
  replyRegisterWaMessageUsecase: asClass(ReplyRegisterWaMessageUsecase).singleton(),
  replyProfileWaMessageUsecase: asClass(ReplyProfileWaMessageUsecase).singleton(),
  replyEventWaMessageUsecase: asClass(ReplyEventWaMessageUsecase).singleton(),
  replySearchEventWaMessageUsecase: asClass(ReplySearchEventWaMessageUsecase).singleton(),
  replyLogoutWaMessageUsecase: asClass(ReplyLogoutWaMessageUsecase).singleton(),
  replyLoginWaMessageUsecase: asClass(ReplyLoginWaMessageUsecase).singleton(),
  deleteUserUseCase: asClass(DeleteUserUseCase).singleton(),
});

export default container;
