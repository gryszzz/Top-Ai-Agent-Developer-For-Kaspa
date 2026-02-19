const SOMPI_PER_KAS = 100_000_000n;

export function sompiToKasString(sompi: bigint): string {
  const whole = sompi / SOMPI_PER_KAS;
  const fraction = sompi % SOMPI_PER_KAS;

  if (fraction === 0n) {
    return whole.toString();
  }

  return `${whole.toString()}.${fraction
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "")}`;
}
