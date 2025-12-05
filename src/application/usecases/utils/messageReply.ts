import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { IdGeneratorService } from "@/domain/Services/IdGeneratorService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";
import type { MessageSent } from "@/domain/entities/MessageSent";
import { logger } from "@/commons/logger";

type ReplyDeps = {
  whatsappService: WhatsappService;
  messageRepository: MessageRepository;
  idGenerator: IdGeneratorService;
};

type ReplyOptions = {
  to?: string;
  save?: boolean;
};

export async function replyToUser(
  deps: ReplyDeps,
  originalMessage: WaMessage,
  content: string,
  options: ReplyOptions = {},
): Promise<MessageSent | null> {
  if (originalMessage.chatType === "group") {
    return null;
  }

  const target = options.to ?? originalMessage.from;
  const sent = await deps.whatsappService.sendToChat(target, content, originalMessage.chatType);

  if (options.save === false) {
    return sent;
  }

  try {
    await deps.messageRepository.create({
      id: deps.idGenerator.generateId(),
      phoneNumber: target,
      role: "system",
      content: sent.text,
      meta: { id: sent.id, text: sent.text },
    });
  } catch (error) {
    logger.warn("Failed to save replied message", {
      error,
      target,
    });
  }

  return sent;
}
