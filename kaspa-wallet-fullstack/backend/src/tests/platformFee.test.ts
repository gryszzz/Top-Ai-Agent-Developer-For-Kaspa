import test from "node:test";
import assert from "node:assert/strict";
import { parseKasToSompi, sompiToKasString } from "../kaspa/units";

test("parseKasToSompi handles decimal precision", () => {
  assert.equal(parseKasToSompi("1"), 100_000_000n);
  assert.equal(parseKasToSompi("1.23456789"), 123_456_789n);
  assert.throws(() => parseKasToSompi("0.123456789"));
});

test("sompiToKasString remains inverse-safe for normalized values", () => {
  const values = ["0.01", "1", "12.3456789"];
  for (const value of values) {
    const sompi = parseKasToSompi(value);
    assert.equal(sompiToKasString(sompi), value);
  }
});
