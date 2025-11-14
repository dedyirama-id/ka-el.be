import type { Prisma, PrismaClient } from "@prisma/client";
import type { User } from "@/domain/entities/User";
import type { UserRepository } from "@/domain/repositories/UserRepository";
import { toDomainUser } from "@/infrastructure/mapper/user-mapper";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaTx) {}

  async create(input: { id: string; phoneE164: string; name: string }): Promise<User> {
    const row = await this.db.user.create({
      data: {
        id: input.id,
        phoneE164: input.phoneE164,
        name: input.name,
      },
    });
    return toDomainUser(row);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { phoneE164: phone } });
    return row ? toDomainUser(row) : null;
  }

  async updateProfile(userId: string, profile: string): Promise<User> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: {
        profile,
      },
    });

    return toDomainUser(row);
  }
}
