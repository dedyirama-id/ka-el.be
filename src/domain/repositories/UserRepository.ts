import type { User } from "../entities/User";

export interface UserRepository {
  create(user: { id: string; phoneE164: string; name: string }): Promise<User>;
  findByPhone(phone: string): Promise<User | null>;
}
