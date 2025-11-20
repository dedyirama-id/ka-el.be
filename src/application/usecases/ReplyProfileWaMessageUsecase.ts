import { NotFoundError } from "@/commons/exceptions/NotFoundError";
import type { MessageSent } from "@/domain/entities/MessageSent";
import { Tag } from "@/domain/entities/Tag";
import type { MessageRepository } from "@/domain/repositories/MessageRepository";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import type { AIService } from "@/domain/Services/AIService";
import type { WhatsappService } from "@/domain/Services/WhatsappService";

type Deps = {
  messageRepository: MessageRepository;
  userRepository: UserRepository;
  whatsappService: WhatsappService;
  tagRepository: TagRepository;
  aiService: AIService;
};

export class ReplyProfileWaMessageUsecase {
  constructor(private readonly deps: Deps) {}

  async execute(from: string, value: string): Promise<MessageSent> {
    const normalizedPhone = this.ensureWhatsappPrefix(from);
    const phoneNumber = normalizedPhone.replace(/^whatsapp:/, "");

    if (!value) {
      await this.deps.whatsappService.sendWhatsApp(
        phoneNumber,
        [
          "Kamu masih belum mengirimkan deskripsi profile. Tolong berikan Kael deskripsi profilemu.",
          "Contoh: @profile saya ingin mengikuti lomba BPC (Business Plan Competition)",
        ].join("\n"),
      );
    }

    const existingUser = await this.deps.userRepository.findByPhone(phoneNumber);
    if (!existingUser) {
      throw new NotFoundError("User Not Found");
    }

    const proofedProfile = await this.deps.aiService.proofreadingMessage(value);
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

    const message = await this.deps.whatsappService.sendWhatsApp(
      phoneNumber,
      [
        `Okey, Kael sudah memperbarui profilemu! Ka'el akan memberikan notifikasi lomba yang sesuai dengan minatmu, ${updatedUser.name}.`,
        "",
        `> ${updatedUser.profile}`,
        `> ${updatedUser.tags.map((tag) => `\`${tag.name}\``).join(", ")}`,
      ].join("\n"),
    );
    return message;
  }

  private ensureWhatsappPrefix(phone: string): string {
    return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  }

  toTitleCase(str: string) {
    return str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
}
