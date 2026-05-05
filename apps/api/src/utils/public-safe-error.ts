const HEX_32_BYTE_PATTERN = /0x[a-fA-F0-9]{64}/g;
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /\b(private[_ -]?key|mnemonic|secret|password|token)\b\s*[:=]\s*[^\s,;)]+/gi;

export function publicSafeErrorReason(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

  const redacted = raw
    .replace(URL_PATTERN, "[redacted-url]")
    .replace(HEX_32_BYTE_PATTERN, "[redacted-32-byte-hex]")
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, "$1=[redacted]")
    .slice(0, 300);

  return redacted || "Unknown error";
}
