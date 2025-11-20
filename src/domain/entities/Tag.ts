export interface TagProps {
  id: number | undefined;
  name: string;
  slug: string;
}

export class Tag {
  private props: TagProps;

  constructor(props: TagProps) {
    this.props = props;
  }

  static createNew(name: string): Tag {
    const slug = this.prototype.slugify(name);
    return new Tag({
      id: undefined,
      name,
      slug,
    });
  }

  static fromPersistence(props: TagProps): Tag {
    return new Tag({
      id: props.id,
      name: props.name,
      slug: props.slug,
    });
  }

  get id() {
    return this.props.id;
  }

  get name() {
    return this.props.name;
  }

  get isPersisted() {
    return this.props.id ?? false;
  }

  public toProps(): TagProps {
    return { ...this.props };
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
