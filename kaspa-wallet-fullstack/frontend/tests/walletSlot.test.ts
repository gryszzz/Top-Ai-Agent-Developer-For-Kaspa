import { describe, expect, it } from "vitest";
import { walletTypeForSlot } from "../src/lib/walletSlot";

describe("walletTypeForSlot", () => {
  it("maps injected wallets directly", () => {
    expect(walletTypeForSlot("kasware")).toBe("kasware");
    expect(walletTypeForSlot("kastle")).toBe("kastle");
  });

  it("maps address-backed slots to distinct backend wallet types", () => {
    expect(walletTypeForSlot("kaspium")).toBe("kaspium");
    expect(walletTypeForSlot("kng-web")).toBe("kng_web");
    expect(walletTypeForSlot("kng-mobile")).toBe("kng_mobile");
    expect(walletTypeForSlot("ledger-kasvault")).toBe("ledger_kasvault");
    expect(walletTypeForSlot("cli-wallet")).toBe("cli_wallet");
  });
});
