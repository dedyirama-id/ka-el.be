import type { Prisma, PrismaClient } from "@prisma/client";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import { Event } from "@/domain/entities/Event";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly db: PrismaTx) {}

  async save(event: Event): Promise<Event> {
    const props = event.toProps();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, tags, ...rest } = props;

    if (event.isPersisted) {
      const updated = await this.db.event.update({
        where: { id: id! },
        data: {
          ...rest,
          tags: {
            createMany: {
              data: tags.map((tag) => ({ tagId: tag.id! })),
              skipDuplicates: true,
            },
          },
        },
      });

      return Event.fromPersistence({
        ...props,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    }

    const created = await this.db.event.create({
      data: {
        ...rest,
        tags: {
          createMany: {
            data: tags.map((tag) => ({ tagId: tag.id! })),
            skipDuplicates: true,
          },
        },
      },
    });

    return Event.fromPersistence({
      ...props,
      id: created.id,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }
}
