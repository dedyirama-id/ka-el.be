import { NotFoundError } from "@/commons/exceptions/NotFoundError";
import type { MessageSent } from "@/domain/entities/MessageSent";
import { Tag } from "@/domain/entities/Tag";
import type { WaMessage } from "@/domain/entities/WaMessage";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { MessageGenerator } from "@/domain/Services/MessageGenerator";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  messageRepository: MessageRepository;
  userRepository: UserRepository;
  whatsappService: WhatsappService;
  tagRepository: TagRepository;
  aiService: AIService;
  messageGenerator: MessageGenerator;
};

export class ReplyProfileWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(message: WaMessage): Promise<MessageSent> {
    if (!message.text || message.text.trim() === "") {
      await this.deps.whatsappService.sendToChat(
        message.from,
        [
          "Kamu masih belum mengirimkan deskripsi profile. Tolong berikan Kael deskripsi profilemu.",
          "Contoh: @profile saya ingin mengikuti lomba BPC (Business Plan Competition)",
        ].join("\n"),
        message.chatType,
      );
    }

    const existingUser = await this.deps.userRepository.findByPhone(message.from);
    if (!existingUser) {
      throw new NotFoundError("User Not Found");
    }

    const proofedProfile = await this.deps.aiService.proofreadingMessage(message.text);
    const tags = await this.deps.aiService.parseTags(proofedProfile);
    const existingTags = await this.deps.tagRepository.findByNames(
      tags.map((tag) => tag.toLowerCase()),
    );
    const newTagNames = tags
      .filter(
        (tag) =>
          !existingTags.some((existingTag) => existingTag.name.toLowerCase() === tag.toLowerCase()),
      )
      .map((tagName) => Tag.createNew(tagName));
    const newTags = await this.deps.tagRepository.saveMany(newTagNames);

    existingUser.setProfile(proofedProfile);
    existingUser.setTags([...existingTags, ...newTags]);
    const updatedUser = await this.deps.userRepository.save(existingUser);

    const messageContent = this.deps.messageGenerator.generateProfileUpdateMessage(
      updatedUser.name,
      updatedUser.profile ?? "",
      updatedUser.tags.map((tag) => tag.name),
    );
    const messageSent = await this.deps.whatsappService.sendToChat(
      message.from,
      messageContent,
      message.chatType,
    );
    return messageSent;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
