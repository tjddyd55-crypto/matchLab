/**
 * Gym Member Operations Phase — static verify
 *
 *   npm run verify:gym-member-operations
 *
 * Covers hub wiring, sales SSOT, renewal history, Billing isolation,
 * and documents intentional gaps (session count / sport-membership FK).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertNoBillingLeak(rel: string) {
  const src = read(rel);
  assert.doesNotMatch(
    src,
    /BillingPayment|BillingSubscription|BillingPaymentMethod|BillingPlan\b/,
    `${rel} must not touch MATCHON SaaS Billing`,
  );
}

function main() {
  // --- Hub actions ---
  const page = read("src/app/(dashboard)/gym/members/[memberId]/page.tsx");
  assert.match(page, /GymMemberOpsActionBar/);
  assert.match(page, /이용권 등록/);
  assert.match(page, /결제 내역/);
  assert.match(page, /최근 출석/);
  assert.match(page, /memberNameQ/);
  assert.match(page, /daysRemaining/);
  assert.match(page, /id=\"attendance\"/);
  assert.match(page, /GymMemberMembershipPanel/);

  const opsBar = read(
    "src/components/domain/gym-members/GymMemberOpsActionBar.tsx",
  );
  assert.match(opsBar, /op=sale/);
  assert.match(opsBar, /SalesEntryModal/);
  assert.match(opsBar, /GymMemberManualAttendanceDialog/);
  assert.match(opsBar, /수정/);
  assert.match(opsBar, /결제/);
  assert.match(opsBar, /출석 처리/);
  assert.match(opsBar, /이용권 등록/);

  const attendanceDlg = read(
    "src/components/domain/gym-members/GymMemberManualAttendanceDialog.tsx",
  );
  assert.match(attendanceDlg, /createManualGymAttendanceAction/);

  // --- Membership create / renew / remaining days / deeplink ---
  const panel = read(
    "src/components/domain/gym-members/GymMemberMembershipPanel.tsx",
  );
  assert.match(panel, /sellGymMembershipAction/);
  assert.match(panel, /재등록/);
  assert.match(panel, /initialOp/);
  assert.match(panel, /daysRemaining/);
  assert.match(panel, /일 남음/);

  const saleSvc = read("src/lib/services/gym-membership-sale.service.ts");
  assert.match(saleSvc, /sellMembership/);
  assert.match(saleSvc, /creationSource/);
  assert.match(saleSvc, /GymMemberSubscriptionCreationSource\.renew/);
  assert.match(saleSvc, /gymMemberPayment\.create/);
  assert.match(saleSvc, /gymMemberSubscription\.create/);
  // History preservation: renew creates new subscription, not overwrite-only
  assert.match(saleSvc, /\$transaction/);
  assert.doesNotMatch(saleSvc, /subscription\.updateMany\(\s*\{\s*data:\s*\{\s*startedAt/);

  // --- Sales projection SSOT ---
  const salesSvc = read("src/lib/services/gym-sales.service.ts");
  assert.match(salesSvc, /gymMemberPayment\.findMany/);
  assert.match(salesSvc, /getMemberSalesSummary/);
  assert.match(salesSvc, /computeNetSales/);
  assert.match(salesSvc, /getSalesPeriodRange\(\"today\"\)/);

  const salesCalc = read("src/lib/gym-sales/calc.ts");
  assert.match(salesCalc, /computeNetSales/);
  assert.match(salesCalc, /getSalesPeriodRange/);

  // --- Partial update safety: sale service must not mutate sport profile values ---
  assert.doesNotMatch(saleSvc, /sportTemplateAssignment|GymMemberProfileValue|gymMemberSport/);
  assert.doesNotMatch(
    read("src/lib/services/gym-member-payment.service.ts"),
    /sportTemplateAssignment|GymMemberProfileValue/,
  );

  // --- MATCHON Billing isolation ---
  for (const rel of [
    "src/lib/services/gym-membership-sale.service.ts",
    "src/lib/services/gym-member-payment.service.ts",
    "src/lib/services/gym-sales.service.ts",
    "src/lib/services/gym-member.service.ts",
    "src/components/domain/gym-members/GymMemberOpsActionBar.tsx",
    "src/components/domain/gym-members/GymMemberMembershipPanel.tsx",
    "src/components/domain/gym-sales/SalesEntryModal.tsx",
  ]) {
    assertNoBillingLeak(rel);
  }

  // Nav separation still intact
  const nav = read("src/lib/navigation/gym-portal-navigation.ts");
  assert.match(nav, /매출 관리/);
  assert.match(nav, /MATCHON 구독/);
  assert.match(nav, /\/gym\/sales/);
  assert.match(nav, /\/gym\/billing\/account/);

  // Status SSOT: expiring within 7 days is display-only
  const status = read("src/lib/gym-member-membership-status.ts");
  assert.match(status, /EXPIRING_WITHIN_DAYS = 7/);
  assert.match(status, /expiring/);
  assert.match(status, /no_plan/);

  // --- Documented gaps (must remain absent) ---
  const schema = read("prisma/schema.prisma");
  assert.doesNotMatch(
    schema,
    /model GymMemberSubscription[\s\S]{0,800}remainingSessions/,
    "GAP: remainingSessions not a first-class field (intentional)",
  );
  const attendanceSvc = read("src/lib/services/gym-attendance.service.ts");
  assert.doesNotMatch(
    attendanceSvc,
    /remainingSessions|decrementSession|sessionCount/,
    "GAP: attendance must not invent session deduction",
  );

  console.log("verify:gym-member-operations: ALL OK");
  console.log(
    "GAP documented: session-count deduction=N/A; sport↔membership FK=N/A",
  );
}

main();
