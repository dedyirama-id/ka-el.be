import type { User as UserRow } from "@prisma/client";
import { User } from "@/domain/entities/User";

export const toDomainUser = (row: UserRow): User =>
  User.fromPersistence({
    id: row.id,
    phoneE164: row.phoneE164,
    name: row.name,
    profile: row.profile,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isLoggedIn: row.isLoggedIn,
    tz: row.tz,
    tags: [], // Tags should be loaded separately
  });
