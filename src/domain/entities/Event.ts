import { Tag } from "./Tag";

export interface EventProps {
  id: number | undefined;
  title: string;
  slug: string;
  description: string | null;
  organizer: string;
  url: string | null;
  startDate: Date;
  endDate: Date;
  priceMin: number;
  priceMax: number;
  hasCertificate: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: Tag[];
  raw: string | null;
}

export type NewEventParams = Omit<EventProps, "id" | "createdAt" | "updatedAt" | "tags"> & {
  tags: string[];
};

export class Event {
  private props: EventProps;

  private constructor(props: EventProps) {
    if (props.endDate < props.startDate) {
      throw new Error("endDate cannot be before startDate");
    }

    if (props.priceMin != null && props.priceMax != null) {
      if (props.priceMin > props.priceMax) {
        throw new Error("priceMin cannot be greater than priceMax");
      }
    }

    this.props = props;
  }

  static createNew(params: NewEventParams): Event {
    const now = new Date();
    const tags = params.tags.map((name) => Tag.createNew(name));

    return new Event({
      id: undefined,
      title: params.title,
      slug: params.slug,
      description: params.description ?? null,
      organizer: params.organizer,
      url: params.url ?? null,
      startDate: params.startDate,
      endDate: params.endDate,
      priceMin: params.priceMin ?? null,
      priceMax: params.priceMax ?? null,
      hasCertificate: params.hasCertificate ?? false,
      createdAt: now,
      updatedAt: now,
      tags: tags,
      raw: params.raw ?? null,
    });
  }

  static fromPersistence(props: EventProps): Event {
    return new Event(props);
  }

  get id() {
    return this.props.id;
  }
  get isPersisted() {
    return this.props.id ?? false;
  }

  get title() {
    return this.props.title;
  }
  get slug() {
    return this.props.slug;
  }
  get description() {
    return this.props.description;
  }
  get organizer() {
    return this.props.organizer;
  }
  get startDate() {
    return this.props.startDate;
  }
  get endDate() {
    return this.props.endDate;
  }
  get priceMin() {
    return this.props.priceMin;
  }
  get priceMax() {
    return this.props.priceMax;
  }
  get hasCertificate() {
    return this.props.hasCertificate;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
  get tags() {
    return this.props.tags;
  }
  get raw() {
    return this.props.raw;
  }

  setTags(tags: Tag[]) {
    this.props.tags = tags;
  }

  toProps(): EventProps {
    return { ...this.props };
  }
}
