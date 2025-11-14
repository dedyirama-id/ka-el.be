export class User {
  constructor(
    public readonly id: string,
    public name: string,
    public profile: string,
    public phoneE164: string,
    public tz: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
