export class MessageReceived {
  constructor(
    public readonly id: string,
    public readonly from: string,
    public readonly intent: string,
    public readonly value: string,
    public readonly text: string,
  ) {}
}
