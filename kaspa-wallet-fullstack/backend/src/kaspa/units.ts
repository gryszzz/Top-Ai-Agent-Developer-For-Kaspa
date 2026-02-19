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
