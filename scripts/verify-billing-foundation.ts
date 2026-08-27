/**
 * Static verifies for Billing Foundation Phase A.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertSchema() {
  const schema = read("prisma/schema.prisma");
  for (const name of [
    "BillingAccount",
    "CreditWallet",
    "CreditLedger",
    "BillingOwnerType",
    "BillingLedgerType",
    "BillingServiceType",
    "credit_manual_charged",
  ]) {
    assert.match(schema, new RegExp(name));
  }
  assert.match(schema, /idempotencyKey/);
  assert.match(schema, /balanceBefore/);
  assert.match(schema, /legacyLedgerId/);
  // Legacy preserved
  assert.match(schema, /OrganizerCreditWallet/);
  assert.match(schema, /OrganizerCreditLedger/);
}

function assertMigration() {
  const sql = read(
    "prisma/migrations/20260826120000_billing_foundation_phase_a/migration.sql",
  );
  assert.match(sql, /BillingAccount_owner_integrity_check/);
  assert.match(sql, /CreditWallet_balance_nonnegative_check/);
  assert.match(sql, /CREATE TABLE "CreditLedger"/);
  assert.doesNotMatch(sql, /\bDROP TABLE\b/i);
  assert.doesNotMatch(sql, /OrganizerCreditWallet/);
}

function assertEngine() {
  const svc = read("src/lib/services/billing-credit.service.ts");
  assert.match(svc, /FOR UPDATE|lockWalletById/);
  assert.match(svc, /idempotencyKey/);
  assert.match(svc, /balanceAfter < 0/);
  assert.match(svc, /manualChargeOrganizer/);
  assert.match(svc, /credit_manual_charged/);

  const credit = read("src/lib/services/credit.service.ts");
  assert.match(credit, /billingCreditService\.debitOrganizer/);
  assert.match(credit, /billingCreditService\.refundOrganizer/);
  assert.match(credit, /event_application:\$\{applicationId\}:approve/);
  assert.match(credit, /event_application:\$\{applicationId\}:refund/);
}

function assertProvisioning() {
  const assoc = read("src/lib/services/association-application.service.ts");
  assert.match(assoc, /ensureOrganizerBillingAccount/);
  const gym = read("src/lib/services/gym-application.service.ts");
  assert.match(gym, /ensureGymBillingAccount/);
}

function assertBackfillScript() {
  const script = read("scripts/backfill-billing-accounts.ts");
  assert.match(script, /assertYamanote/);
  assert.match(script, /--dry-run|--apply/);
  assert.match(script, /yamabiko/);
  assert.match(script, /legacyLedgerId/);
}

assertSchema();
assertMigration();
assertEngine();
assertProvisioning();
assertBackfillScript();
console.log("PASS verify:billing-foundation");
