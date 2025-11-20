import type { Prisma, PrismaClient } from "@prisma/client";
import type { TagRepository } from "@/domain/repositories/TagRepository";
import { Tag } from "@/domain/entities/Tag";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

export class PrismaTagRepository implements TagRepository {
  constructor(private readonly db: PrismaTx) {}

  async save(tag: Tag): Promise<Tag> {
    const props = tag.toProps();
    const { id, ...rest } = props;

    if (tag.isPersisted) {
      const created = await this.db.tag.update({
        where: { id: id! },
        data: { ...rest },
      });

      return Tag.fromPersistence(created);
    }

    const created = await this.db.tag.create({
      data: { ...rest },
    });

    return Tag.fromPersistence(created);
  }

  async saveMany(tags: Tag[]): Promise<Tag[]> {
    const savedTags: Tag[] = [];
    for (const tag of tags) {
      const savedTag = await this.save(tag);
      savedTags.push(savedTag);
    }
    return savedTags;
  }

  async findByNames(names: string[]): Promise<Tag[]> {
    const found = await this.db.tag.findMany({
      where: {
        name: {
          in: names,
        },
      },
    });
    return found.map((tagData) => Tag.fromPersistence(tagData));
  }
}
