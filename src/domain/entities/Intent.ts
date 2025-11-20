export interface IntentProps {
  token: string;
  value: string;
  raw: string;
}

export class Intent {
  private props: IntentProps;

  constructor(props: IntentProps) {
    this.props = props;
  }

  get token() {
    return this.props.token;
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
