import type { User as UserRow } from "@prisma/client";
import { User } from "@/domain/entities/User";

export const toDomainUser = (row: UserRow): User =>
  new User(row.id, row.name, row.profile, row.phoneE164, row.tz ?? null, row.createdAt, row.updatedAt);
