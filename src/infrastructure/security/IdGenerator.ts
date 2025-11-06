import { randomUUIDv7 } from "bun";

export class IdGenerator {
  generateId(): string {
    return randomUUIDv7();
  }
}
