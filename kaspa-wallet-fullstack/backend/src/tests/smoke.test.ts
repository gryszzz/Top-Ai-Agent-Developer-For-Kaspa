import test from "node:test";
import assert from "node:assert/strict";
import { sompiToKasString } from "../kaspa/units";

test("sompiToKasString converts precision safely", () => {
  assert.equal(sompiToKasString(123_456_789n), "1.23456789");
  assert.equal(sompiToKasString(100_000_000n), "1");
  assert.equal(sompiToKasString(0n), "0");
});
