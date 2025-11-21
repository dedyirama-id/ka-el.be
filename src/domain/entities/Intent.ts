export interface IntentProps {
  intent: string;
  value: string;
  raw: string;
}

export class Intent {
  private props: IntentProps;

  constructor(props: IntentProps) {
    this.props = props;
  }

  get intent() {
    return this.props.intent;
  }
  get value() {
    return this.props.value;
  }
  get raw() {
    return this.props.raw;
  }

  public toProps(): IntentProps {
    return { ...this.props };
  }
}
