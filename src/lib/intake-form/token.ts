import { randomBytes } from "node:crypto";

const TOKEN_BYTES = 24;

/** opaque public token — DB PK 직접 노출 방지 */
export function generateIntakeFormPublicToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}
