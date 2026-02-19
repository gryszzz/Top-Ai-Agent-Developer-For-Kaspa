const SOMPI_PER_KAS = 100_000_000n;

export function sompiToKasString(value: bigint): string {
  const whole = value / SOMPI_PER_KAS;
  const fractional = value % SOMPI_PER_KAS;

  if (fractional === 0n) {
    return whole.toString();
  }

  const fractionalPadded = fractional.toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionalPadded}`;
}

export function parseKasToSompi(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(normalized)) {
    throw new Error("Amount must be a positive KAS value with up to 8 decimals");
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const whole = BigInt(wholePart);
  const fractional = BigInt(fractionalPart.padEnd(8, "0"));
  return whole * SOMPI_PER_KAS + fractional;
}
