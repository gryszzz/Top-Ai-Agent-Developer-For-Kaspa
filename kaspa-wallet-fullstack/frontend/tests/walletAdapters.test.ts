import { describe, expect, it } from "vitest";
import { buildKaspaUri } from "../src/lib/walletAdapters";

describe("buildKaspaUri", () => {
  it("builds a URI with amount and note", () => {
    const result = buildKaspaUri("kaspatest:qpv7fcvdlz6th4hqjtm9qkkms2dw0raem963x3hm8glu3kjgj7922vy69hv85", "1.25", "hello");
    expect(result).toContain("kaspatest:");
    expect(result).toContain("amount=1.25");
    expect(result).toContain("message=hello");
  });
});
