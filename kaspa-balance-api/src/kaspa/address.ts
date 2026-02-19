const KASPA_BASE32_REGEX = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i;

export function validateKaspaAddress(
  address: string,
  allowedPrefixes: string[]
): { valid: true } | { valid: false; reason: string } {
  if (!address || address.length < 12 || address.length > 120) {
    return { valid: false, reason: "Address length is invalid" };
  }

  const separatorIndex = address.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === address.length - 1) {
    return { valid: false, reason: "Address must include a valid prefix" };
  }

  const prefix = address.slice(0, separatorIndex).toLowerCase();
  const payload = address.slice(separatorIndex + 1);

  if (!allowedPrefixes.includes(prefix)) {
    return { valid: false, reason: `Address prefix '${prefix}' is not allowed` };
  }

  if (!KASPA_BASE32_REGEX.test(payload)) {
    return { valid: false, reason: "Address payload has invalid characters" };
  }

  return { valid: true };
}
