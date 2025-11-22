import { Tag } from "./Tag";

export interface UserProps {
  id: string | undefined;
  name: string;
  profile: string | null | undefined;
  phoneE164: string;
  tz: string;
  createdAt: Date;
  updatedAt: Date;
  isLoggedIn: boolean;
  deleteToken?: string;
  tags: Tag[];
}

export type NewUserParams = Omit<UserProps, "id" | "createdAt" | "updatedAt" | "tags"> & {
  tags: string[];
};

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  static createNew(params: NewUserParams): User {
    const now = new Date();
    const tags = params.tags.map((name) => Tag.createNew(name));

    return new User({
      id: undefined,
      name: params.name,
      profile: params.profile,
      phoneE164: params.phoneE164,
      tz: params.tz,
      createdAt: now,
      updatedAt: now,
      isLoggedIn: params.isLoggedIn,
      tags: tags,
    });
  }

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get id() {
    return this.props.id;
  }
  get isPersisted() {
    return this.props.id ?? false;
  }
  get name() {
    return this.props.name;
  }
  get profile() {
    return this.props.profile;
  }
  get phoneE164() {
    return this.props.phoneE164;
  }
  get tz() {
    return this.props.tz;
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
  get deleteToken() {
    return this.props.deleteToken;
  }

  isLoggedIn() {
    return this.props.isLoggedIn;
  }

  setProfile(profile: string) {
    this.props.profile = profile.trim();
  }
  setTags(tags: Tag[]) {
    this.props.tags = tags;
  }
  setIsLoggedIn(isLoggedIn: boolean) {
    this.props.isLoggedIn = isLoggedIn;
  }

  toProps(): UserProps {
    return { ...this.props };
  }
}
