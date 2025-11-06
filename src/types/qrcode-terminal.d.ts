declare module "qrcode-terminal" {
  type GenerateOptions = {
    small?: boolean;
  };

  type GenerateCallback = (qr: string) => void;

  export function generate(
    text: string,
    options?: GenerateOptions,
    callback?: GenerateCallback,
  ): void;

  export function setErrorLevel(level: "L" | "M" | "Q" | "H"): void;
}
