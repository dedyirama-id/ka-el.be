import type { ChatType } from "../value-objects/ChatType";

export interface WaMessageProps {
  from: string; // sender phone (E.164) or originating number
  to: string; // recipient: personal phone E.164 or group id
  text: string;
  chatType: ChatType;
  intent?: string;
  value?: string;
  participant?: string; // sender phone in group chat
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
    const phoneRegex = /^\+\d{10,20}$/;
    if (props.chatType === "personal") {
      if (!phoneRegex.test(props.from.toString())) {
        throw new Error("Invalid phone number format");
      }
      if (!phoneRegex.test(props.to.toString())) {
        throw new Error("Invalid phone number format");
      }
      return;
    }

    if (!props.participant || !phoneRegex.test(props.participant.toString())) {
      throw new Error("Group messages require participant phone number");
    }

    if (!props.to) {
      throw new Error("Group messages require destination group id");
    }
  }
}
