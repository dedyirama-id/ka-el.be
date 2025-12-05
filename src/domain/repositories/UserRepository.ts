import type { UserRole } from "../value-objects/UserRole";
import type { User } from "../entities/User";

export interface UserRepository {
  create(user: { id: string; phoneE164: string; name: string; role?: UserRole }): Promise<User>;
  findByPhone(phone: string): Promise<User | null>;
  updateProfile(userId: string, profile: string): Promise<User | null>;
  save(user: User): Promise<User>;
  findAll(): Promise<User[]>;
  findByIds(ids: string[]): Promise<User[]>;
  findByTags(tagNames: string[]): Promise<User[]>;
  findByRole(role: UserRole): Promise<User[]>;
  deleteAccount(deleteToken: string): Promise<void>;
}
