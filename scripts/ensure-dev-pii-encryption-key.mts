/**
 * Ensure local .env has Development MATCHON_PII_ENCRYPTION_KEY.
 * Never prints the secret. Never writes Production.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const KEY = "MATCHON_PII_ENCRYPTION_KEY";
const envPath = ".env";

function isValidKey(raw: string): boolean {
  const value = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) return true;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

if (!existsSync(envPath)) {
  console.error("FAIL: .env not found");
  process.exit(1);
}

const original = readFileSync(envPath, "utf8");
const lines = original.split(/\r?\n/);
let found = false;
let updated = false;
const next = lines.map((line) => {
  if (!line.startsWith(`${KEY}=`)) return line;
  found = true;
  const current = line.slice(`${KEY}=`.length);
  if (isValidKey(current)) return line;
  updated = true;
  return `${KEY}=${randomBytes(32).toString("hex")}`;
});
if (!found) {
  if (!original.endsWith("\n") && original.length > 0) next.push("");
  next.push(`${KEY}=${randomBytes(32).toString("hex")}`);
  updated = true;
}
if (updated) {
  writeFileSync(envPath, next.join("\n"), "utf8");
}

const value = readFileSync(envPath, "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith(`${KEY}=`))
  ?.slice(`${KEY}=`.length)
  .trim();

console.log(
  JSON.stringify({
    ok: Boolean(value && isValidKey(value)),
    updated,
    alreadyPresent: found && !updated,
  }),
);
