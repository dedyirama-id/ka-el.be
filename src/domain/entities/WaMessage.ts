import type { ChatType } from "../value-objects/ChatType";

export interface WaMessageProps {
  from: string;
  to: string;
  text: string;
  chatType: ChatType;
  intent?: string;
  value?: string;
  participant?: string;
}

export class WaMessage {
  private props: WaMessageProps;
  constructor(props: WaMessageProps) {
    this.validate(props);
    this.props = props;
  }

  get from() {
    return this.props.from;
  }
  get to() {
    return this.props.to;
  }
  get text() {
    return this.props.text;
  }
  get chatType() {
    return this.props.chatType;
  }
  get intent() {
    return this.props.intent;
  }
  get value() {
    return this.props.value;
  }
  get participant() {
    return this.props.participant;
  }

  toProps(): WaMessageProps {
    return this.props;
  }

  validate(props: WaMessageProps): void {
    if (!/^\+\d{10,20}$/.test(props.from.toString())) {
      throw new Error("Invalid phone number format");
    }
    if (!/^\+\d{10,20}$/.test(props.to.toString())) {
      throw new Error("Invalid phone number format");
    }
  }
}
