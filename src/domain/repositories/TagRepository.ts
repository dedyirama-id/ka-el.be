import type { Tag } from "../entities/Tag";

export interface TagRepository {
  save(tag: Tag): Promise<Tag>;
  saveMany(tags: Tag[]): Promise<Tag[]>;
  findByNames(names: string[]): Promise<Tag[]>;
}
