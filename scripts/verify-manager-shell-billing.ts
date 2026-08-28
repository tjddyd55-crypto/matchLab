/**
 * Static SSOT: billing account lives inside Manager dashboard shell.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function managerShellBilling() {
  assert.ok(
    read("src/app/(dashboard)/organizer/billing/account/page.tsx").includes(
      "BillingAccountView",
    ),
  );
  assert.ok(
    read("src/app/(dashboard)/gym/billing/account/page.tsx").includes(
      "BillingAccountView",
    ),
  );

  const organizerNav = read("src/lib/navigation/organizer-global-navigation.ts");
  const gymNav = read("src/lib/navigation/gym-portal-navigation.ts");
  assert.ok(organizerNav.includes('"/organizer/billing/account"'));
  assert.ok(gymNav.includes('"/gym/billing/account"'));
  assert.equal(organizerNav.includes('"/billing/account"'), false);
  assert.equal(gymNav.includes('"/billing/account"'), false);

  const legacy = read("src/app/(billing)/billing/account/page.tsx");
  assert.ok(legacy.includes("billingAccountPathForRole"));
  assert.ok(legacy.includes("redirect("));

  const billingLayout = read("src/app/(billing)/layout.tsx");
  assert.ok(billingLayout.includes("min-h-dvh"));
  assert.equal(billingLayout.includes("DashboardShell"), false);

  console.log("verify:manager-shell-billing: PASS");
}

managerShellBilling();
