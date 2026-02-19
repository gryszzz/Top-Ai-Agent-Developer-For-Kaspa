import { env } from "../config/env";
import { parseKasToSompi, sompiToKasString } from "../kaspa/units";

const BPS_DENOMINATOR = 10_000n;

export type PlatformFeeBreakdown = {
  recipientAddress: string;
  feeBps: number;
  minFeeKas: string;
  feeSompi: string;
  feeKas: string;
  amountSompi: string;
  amountKas: string;
  totalDebitSompi: string;
  totalDebitKas: string;
  applied: boolean;
  enabled: boolean;
};

function calculateFeeSompi(amountSompi: bigint, feeBps: number, minFeeSompi: bigint): bigint {
  if (feeBps <= 0) {
    return 0n;
  }

  const calculated = (amountSompi * BigInt(feeBps) + (BPS_DENOMINATOR - 1n)) / BPS_DENOMINATOR;
  return calculated < minFeeSompi ? minFeeSompi : calculated;
}

export function quotePlatformFee(amountKas: string): PlatformFeeBreakdown {
  const amountSompi = parseKasToSompi(amountKas);
  if (amountSompi <= 0n) {
    throw new Error("Amount must be greater than zero");
  }

  if (!env.PLATFORM_FEE_ENABLED) {
    return {
      recipientAddress: env.PLATFORM_FEE_RECIPIENT,
      feeBps: env.PLATFORM_FEE_BPS,
      minFeeKas: env.PLATFORM_FEE_MIN_KAS,
      feeSompi: "0",
      feeKas: "0",
      amountSompi: amountSompi.toString(),
      amountKas: sompiToKasString(amountSompi),
      totalDebitSompi: amountSompi.toString(),
      totalDebitKas: sompiToKasString(amountSompi),
      applied: false,
      enabled: false
    };
  }

  const minFeeSompi = parseKasToSompi(env.PLATFORM_FEE_MIN_KAS);
  const feeSompi = calculateFeeSompi(amountSompi, env.PLATFORM_FEE_BPS, minFeeSompi);
  const totalDebitSompi = amountSompi + feeSompi;

  return {
    recipientAddress: env.PLATFORM_FEE_RECIPIENT,
    feeBps: env.PLATFORM_FEE_BPS,
    minFeeKas: env.PLATFORM_FEE_MIN_KAS,
    feeSompi: feeSompi.toString(),
    feeKas: sompiToKasString(feeSompi),
    amountSompi: amountSompi.toString(),
    amountKas: sompiToKasString(amountSompi),
    totalDebitSompi: totalDebitSompi.toString(),
    totalDebitKas: sompiToKasString(totalDebitSompi),
    applied: feeSompi > 0n,
    enabled: true
  };
}
