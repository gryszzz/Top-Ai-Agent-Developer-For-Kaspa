import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../config/env";
import { quotePlatformFee } from "../monetization/platformFee";

test("quotePlatformFee calculates bps and total debit", () => {
  const quote = quotePlatformFee("10");
  assert.equal(quote.amountKas, "10");

  if (!env.PLATFORM_FEE_ENABLED) {
    assert.equal(quote.feeKas, "0");
    assert.equal(quote.totalDebitKas, "10");
    return;
  }

  assert.equal(quote.feeKas, "0.1");
  assert.equal(quote.totalDebitKas, "10.1");
  assert.equal(quote.recipientAddress, env.PLATFORM_FEE_RECIPIENT);
});

test("quotePlatformFee enforces minimum fee", () => {
  const quote = quotePlatformFee("0.05");

  if (!env.PLATFORM_FEE_ENABLED) {
    assert.equal(quote.feeKas, "0");
    return;
  }

  assert.equal(quote.feeKas, env.PLATFORM_FEE_MIN_KAS);
});
