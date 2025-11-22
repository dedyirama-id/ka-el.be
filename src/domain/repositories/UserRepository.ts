import type { User } from "../entities/User";

export interface UserRepository {
  create(user: { id: string; phoneE164: string; name: string }): Promise<User>;
  findByPhone(phone: string): Promise<User | null>;
  updateProfile(userId: string, profile: string): Promise<User | null>;
  save(user: User): Promise<User>;
  findByTags(tagNames: string[]): Promise<User[]>;
  deleteAccount(deleteToken: string): Promise<void>;
}
