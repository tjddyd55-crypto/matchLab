/**
 * Guard: application approval/create paths must not auto-debit credits.
 *   npx tsx scripts/verify-no-auto-credit-application.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const appService = readFileSync(
  join(process.cwd(), "src/lib/services/application.service.ts"),
  "utf8",
);

assert.equal(
  (appService.match(/debitParticipantFee/g) || []).length,
  0,
  "application.service must not call debitParticipantFee (no auto credit apply)",
);

assert.ok(
  appService.includes("refundParticipantFee"),
  "historical charged apps may still refund",
);

console.log("verify-no-auto-credit-application: PASS");
