export const maskNumber = (raw: string): string => {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length <= 4) {
    return "*".repeat(Math.max(digits.length - 1, 0)) + digits.slice(-1);
  }

  const last4 = digits.slice(-4);
  const maskedPrefix = "*".repeat(digits.length - 4);

  return `+${maskedPrefix}${last4}`;
};
