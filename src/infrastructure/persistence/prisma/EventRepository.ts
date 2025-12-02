import type { Prisma, PrismaClient } from "@prisma/client";
import type { EventRepository } from "@/domain/repositories/EventRepository";
import { Event } from "@/domain/entities/Event";
import { Tag } from "@/domain/entities/Tag";

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

  async search(keywords: string[]): Promise<Event[]> {
    const events = await this.db.event.findMany({
      where: {
        OR: keywords.flatMap((keyword) => [
          { title: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
          { organizer: { contains: keyword, mode: "insensitive" } },
          {
            tags: {
              some: {
                tag: {
                  name: { contains: keyword, mode: "insensitive" },
                },
              },
            },
          },
        ]),
        AND: {
          endDate: { gte: new Date() },
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      take: 5,
    });

    return events.map((event) =>
      Event.fromPersistence({
        ...event,
        tags: event.tags.map((et) => Tag.fromPersistence(et.tag)),
      }),
    );
  }

  async findAvailable(limit = 100): Promise<Event[]> {
    const events = await this.db.event.findMany({
      where: {
        endDate: { gte: new Date() },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ startDate: "asc" }, { id: "asc" }],
      take: limit,
    });

    return events.map((event) =>
      Event.fromPersistence({
        ...event,
        tags: event.tags.map((et) => Tag.fromPersistence(et.tag)),
      }),
    );
  }

  async findByIds(ids: number[]): Promise<Event[]> {
    if (ids.length === 0) {
      return [];
    }

    const events = await this.db.event.findMany({
      where: { id: { in: ids } },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return events.map((event) =>
      Event.fromPersistence({
        ...event,
        tags: event.tags.map((et) => Tag.fromPersistence(et.tag)),
      }),
    );
  }
}
