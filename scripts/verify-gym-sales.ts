/**
 * Gym sales static verifies (schema / calc / privacy / nav / scope).
 *   npm run verify:gym-sales-schema
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDailySeries,
  computeNetSales,
  getComparablePriorMonthRange,
  getSalesPeriodRange,
  groupByCategory,
  groupByPaymentMethod,
  paymentMethodLabel,
  salesCategoryLabel,
} from "../src/lib/gym-sales/calc";
import {
  getSeoulYmdParts,
  toSeoulAttendanceDate,
  toSeoulDateOnlyString,
} from "../src/lib/gym-attendance/seoul-date";
import { maskPhoneForAdminList } from "../src/lib/gym-attendance/privacy";
import { getGymPortalNavGroups } from "../src/lib/navigation/gym-portal-navigation";

const root = process.cwd();

function assertSchema() {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  assert.match(schema, /model GymMemberPayment/);
  assert.match(schema, /model GymManualSale/);
  assert.match(schema, /model GymPaymentRefund/);
  assert.match(schema, /model GymReceivable/);
  assert.match(schema, /enum GymSalesCategory/);
  assert.match(schema, /enum GymReceivableStatus/);
  assert.match(schema, /easy_pay/);
  assert.match(schema, /discountAmount/);
  assert.match(schema, /listPrice/);
  assert.match(schema, /gym_sales_manual_created/);
  assert.match(schema, /gym_payment_refund_created/);
  assert.match(schema, /gym_receivable_payment_recorded/);

  const sql = readFileSync(
    join(root, "scripts/sql/add-gym-sales-additive.sql"),
    "utf8",
  );
  assert.doesNotMatch(sql, /DROP\s+TABLE/i);
  assert.doesNotMatch(sql, /accept-data-loss/i);
  assert.match(sql, /GymManualSale/);
  assert.match(sql, /GymPaymentRefund/);
  assert.match(sql, /GymReceivable/);

  console.log("verify:gym-sales-schema: OK");
}

function assertCalculation() {
  const start = new Date(Date.UTC(2026, 6, 1));
  const end = new Date(Date.UTC(2026, 7, 1));
  const payments = [
    {
      amount: 100_000,
      paidAt: new Date(Date.UTC(2026, 6, 10)),
      status: "paid",
      paymentMethod: "card",
      category: "membership",
      discountAmount: 10_000,
      listPrice: 110_000,
    },
    {
      amount: 50_000,
      paidAt: new Date(Date.UTC(2026, 6, 12)),
      status: "cancelled",
      paymentMethod: "cash",
      category: null,
      discountAmount: 0,
      listPrice: null,
    },
  ];
  const manualSales = [
    {
      amount: 20_000,
      soldAt: new Date(Date.UTC(2026, 6, 15)),
      status: "paid",
      paymentMethod: "cash",
      category: "product",
      discountAmount: 0,
      listPrice: 20_000,
    },
  ];
  const refunds = [
    {
      amount: 30_000,
      refundedAt: new Date(Date.UTC(2026, 6, 20)),
      cancelledAt: null,
      refundMethod: "card",
    },
  ];

  const stats = computeNetSales({
    payments,
    manualSales,
    refunds,
    start,
    endExclusive: end,
  });
  assert.equal(stats.grossPaid, 120_000);
  assert.equal(stats.refundTotal, 30_000);
  assert.equal(stats.netSales, 90_000);
  assert.equal(stats.discountTotal, 10_000);
  assert.equal(stats.paymentCount, 2);
  assert.equal(stats.refundCount, 1);

  const daily = buildDailySeries({
    payments,
    manualSales,
    refunds,
    start: new Date(Date.UTC(2026, 6, 19)),
    endExclusive: new Date(Date.UTC(2026, 6, 21)),
  });
  const day20 = daily.find((d) => d.date === "2026-07-20");
  assert.ok(day20);
  assert.equal(day20!.net, -30_000);

  console.log("verify:gym-sales-calculation: OK");
}

function assertPaymentStatus() {
  const start = new Date(Date.UTC(2026, 0, 1));
  const end = new Date(Date.UTC(2026, 1, 1));
  const stats = computeNetSales({
    payments: [
      {
        amount: 10_000,
        paidAt: new Date(Date.UTC(2026, 0, 5)),
        status: "paid",
        paymentMethod: "cash",
        category: null,
        discountAmount: 0,
        listPrice: null,
      },
      {
        amount: 99_000,
        paidAt: new Date(Date.UTC(2026, 0, 5)),
        status: "cancelled",
        paymentMethod: "cash",
        category: null,
        discountAmount: 0,
        listPrice: null,
      },
      {
        amount: 88_000,
        paidAt: new Date(Date.UTC(2026, 0, 5)),
        status: "refunded",
        paymentMethod: "cash",
        category: null,
        discountAmount: 0,
        listPrice: null,
      },
    ],
    manualSales: [],
    refunds: [],
    start,
    endExclusive: end,
  });
  // cancelled 제외. refunded 원결제는 paidAt 매출에 유지(환불은 refund row로 차감).
  assert.equal(stats.grossPaid, 98_000);
  console.log("verify:gym-sales-payment-status: OK");
}

function assertRefund() {
  const start = new Date(Date.UTC(2026, 6, 1));
  const end = new Date(Date.UTC(2026, 7, 1));
  const stats = computeNetSales({
    payments: [
      {
        amount: 100_000,
        paidAt: new Date(Date.UTC(2026, 6, 1)),
        status: "paid",
        paymentMethod: "card",
        category: "membership",
        discountAmount: 0,
        listPrice: 100_000,
      },
    ],
    manualSales: [],
    refunds: [
      {
        amount: 100_000,
        refundedAt: new Date(Date.UTC(2026, 6, 10)),
        cancelledAt: null,
        refundMethod: "card",
      },
    ],
    start,
    endExclusive: end,
  });
  assert.equal(stats.netSales, 0);
  console.log("verify:gym-sales-refund: OK");
}

function assertPartialRefund() {
  const start = new Date(Date.UTC(2026, 6, 1));
  const end = new Date(Date.UTC(2026, 7, 1));
  const stats = computeNetSales({
    payments: [
      {
        amount: 100_000,
        paidAt: new Date(Date.UTC(2026, 6, 1)),
        status: "paid",
        paymentMethod: "card",
        category: "membership",
        discountAmount: 0,
        listPrice: 100_000,
      },
    ],
    manualSales: [],
    refunds: [
      {
        amount: 30_000,
        refundedAt: new Date(Date.UTC(2026, 6, 5)),
        cancelledAt: null,
        refundMethod: "card",
      },
    ],
    start,
    endExclusive: end,
  });
  assert.equal(stats.grossPaid, 100_000);
  assert.equal(stats.refundTotal, 30_000);
  assert.equal(stats.netSales, 70_000);
  console.log("verify:gym-sales-partial-refund: OK");
}

function assertReceivableNotInSales() {
  // Receivables are not in calc inputs — document by ensuring empty refunds/payments stay 0.
  const start = new Date(Date.UTC(2026, 6, 1));
  const end = new Date(Date.UTC(2026, 7, 1));
  const stats = computeNetSales({
    payments: [],
    manualSales: [],
    refunds: [],
    start,
    endExclusive: end,
  });
  assert.equal(stats.netSales, 0);
  const service = readFileSync(
    join(root, "src/lib/services/gym-sales.service.ts"),
    "utf8",
  );
  assert.match(service, /미수금\(GymReceivable\)은 매출에 포함하지 않음/);
  assert.match(service, /collectReceivablePayment/);
  assert.match(service, /input\.amount > remaining/);
  console.log("verify:gym-sales-receivable: OK");
}

function assertManual() {
  const service = readFileSync(
    join(root, "src/lib/services/gym-sales.service.ts"),
    "utf8",
  );
  assert.match(service, /createManualSale/);
  assert.match(service, /MANUAL_SALE/);
  assert.match(service, /gym_sales_manual_created/);
  console.log("verify:gym-sales-manual: OK");
}

function assertPaymentMethod() {
  assert.equal(paymentMethodLabel("card"), "카드");
  assert.equal(paymentMethodLabel("cash"), "현금");
  assert.equal(paymentMethodLabel("transfer"), "계좌이체");
  assert.equal(paymentMethodLabel("easy_pay"), "간편결제");
  assert.equal(paymentMethodLabel("other"), "기타");
  assert.equal(paymentMethodLabel("unspecified"), "미지정");

  const by = groupByPaymentMethod({
    payments: [
      {
        amount: 100,
        paidAt: new Date(Date.UTC(2026, 6, 1)),
        status: "paid",
        paymentMethod: "card",
        category: null,
        discountAmount: 0,
        listPrice: null,
      },
    ],
    manualSales: [],
    refunds: [
      {
        amount: 40,
        refundedAt: new Date(Date.UTC(2026, 6, 2)),
        cancelledAt: null,
        refundMethod: "card",
      },
    ],
    start: new Date(Date.UTC(2026, 6, 1)),
    endExclusive: new Date(Date.UTC(2026, 7, 1)),
  });
  assert.equal(by.find((x) => x.method === "card")?.net, 60);
  console.log("verify:gym-sales-payment-method: OK");
}

function assertCategory() {
  assert.equal(salesCategoryLabel(null), "미분류");
  assert.equal(salesCategoryLabel("unclassified"), "미분류");
  assert.equal(salesCategoryLabel("membership"), "회원권");
  const by = groupByCategory({
    payments: [
      {
        amount: 10,
        paidAt: new Date(Date.UTC(2026, 6, 1)),
        status: "paid",
        paymentMethod: "cash",
        category: null,
        discountAmount: 0,
        listPrice: null,
      },
    ],
    manualSales: [],
    start: new Date(Date.UTC(2026, 6, 1)),
    endExclusive: new Date(Date.UTC(2026, 7, 1)),
  });
  assert.equal(by[0]?.category, "unclassified");
  console.log("verify:gym-sales-category: OK");
}

function assertGymScope() {
  const service = readFileSync(
    join(root, "src/lib/services/gym-sales.service.ts"),
    "utf8",
  );
  assert.match(service, /requireGymPortalSalesManage/);
  assert.doesNotMatch(service, /requireGymPortalRead\(/);
  assert.match(service, /access\.gymId/);
  assert.doesNotMatch(service, /clientGymId/);
  console.log("verify:gym-sales-gym-scope: OK");
}

function assertPermissions() {
  const service = readFileSync(
    join(root, "src/lib/services/gym-sales.service.ts"),
    "utf8",
  );
  const access = readFileSync(
    join(root, "src/lib/gym-portal-access.ts"),
    "utf8",
  );
  assert.match(access, /requireGymPortalSalesManage/);
  assert.match(access, /canManageSales/);
  assert.match(service, /requireGymPortalSalesManage\(actor\)/);
  assert.doesNotMatch(service, /requireGymPortalRead\(/);
  const page = readFileSync(
    join(root, "src/app/(dashboard)/gym/sales/page.tsx"),
    "utf8",
  );
  const receivables = readFileSync(
    join(root, "src/app/(dashboard)/gym/sales/receivables/page.tsx"),
    "utf8",
  );
  assert.match(page, /requireGymPortalSalesManage/);
  assert.match(page, /notFound\(\)/);
  assert.match(receivables, /requireGymPortalSalesManage/);
  assert.match(receivables, /notFound\(\)/);
  console.log("verify:gym-sales-permissions: OK");
}

function assertTimezone() {
  // 23:59 KST = 14:59 UTC same calendar day; 00:01 KST = 15:01 UTC previous UTC day
  const late = new Date("2026-07-24T14:59:00.000Z"); // 23:59 KST
  const early = new Date("2026-07-24T15:01:00.000Z"); // 00:01 KST Jul 25
  assert.equal(toSeoulDateOnlyString(late), "2026-07-24");
  assert.equal(toSeoulDateOnlyString(early), "2026-07-25");
  assert.equal(
    toSeoulAttendanceDate(late).toISOString(),
    "2026-07-24T00:00:00.000Z",
  );

  const range = getSalesPeriodRange(
    "this_month",
    undefined,
    undefined,
    new Date("2026-07-24T12:00:00.000Z"),
  );
  assert.equal(range.start.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-08-01T00:00:00.000Z");

  const prior = getComparablePriorMonthRange(
    new Date("2026-07-24T12:00:00.000Z"),
  );
  assert.equal(prior.start.toISOString(), "2026-06-01T00:00:00.000Z");
  assert.equal(prior.endExclusive.toISOString(), "2026-06-25T00:00:00.000Z");

  const { year, month, day } = getSeoulYmdParts(
    new Date("2026-07-24T12:00:00.000Z"),
  );
  assert.equal(year, 2026);
  assert.equal(month, 7);
  assert.equal(day, 24);
  console.log("verify:gym-sales-timezone: OK");
}

function assertPrivacy() {
  assert.equal(maskPhoneForAdminList("01012345678"), "010-****-5678");
  const service = readFileSync(
    join(root, "src/lib/services/gym-sales.service.ts"),
    "utf8",
  );
  assert.match(service, /maskPhoneForAdminList/);
  assert.doesNotMatch(service, /resident|rrn|주민|addressDetail|signature/i);
  console.log("verify:gym-sales-privacy: OK");
}

function assertDashboard() {
  const page = readFileSync(
    join(root, "src/app/(dashboard)/gym/sales/page.tsx"),
    "utf8",
  );
  assert.match(page, /매출 관리/);
  assert.match(page, /getDashboard/);
  const panel = readFileSync(
    join(root, "src/components/domain/gym-sales/GymSalesDashboardPanel.tsx"),
    "utf8",
  );
  assert.match(panel, /오늘 매출/);
  assert.match(panel, /이번 달 순매출/);
  assert.match(panel, /현재 미수금/);
  assert.match(panel, /수기 매출 등록/);
  assert.match(panel, /data\.disclaimer/);
  const service = readFileSync(
    join(root, "src/lib/services/gym-sales.service.ts"),
    "utf8",
  );
  assert.match(service, /세무 신고/);
  console.log("verify:gym-sales-dashboard: OK");
}

function assertMobileLayout() {
  const panel = readFileSync(
    join(root, "src/components/domain/gym-sales/GymSalesDashboardPanel.tsx"),
    "utf8",
  );
  assert.match(panel, /md:hidden/);
  assert.match(panel, /hidden overflow-x-auto md:block/);
  const nav = getGymPortalNavGroups();
  const sales = nav.find((g) => g.id === "sales");
  assert.equal(sales?.label, "매출 관리");
  assert.deepEqual(
    sales?.items.map((i) => i.label),
    ["매출 현황", "매출 등록", "상품 관리"],
  );
  console.log("verify:gym-sales-mobile-layout: OK");
}

function main() {
  const arg = process.argv[2] ?? "all";
  const map: Record<string, () => void> = {
    schema: assertSchema,
    calculation: assertCalculation,
    "payment-status": assertPaymentStatus,
    refund: assertRefund,
    "partial-refund": assertPartialRefund,
    receivable: assertReceivableNotInSales,
    manual: assertManual,
    "payment-method": assertPaymentMethod,
    category: assertCategory,
    "gym-scope": assertGymScope,
    permissions: assertPermissions,
    timezone: assertTimezone,
    privacy: assertPrivacy,
    dashboard: assertDashboard,
    "mobile-layout": assertMobileLayout,
  };

  if (arg === "all") {
    for (const fn of Object.values(map)) fn();
    console.log("verify:gym-sales: ALL OK");
    return;
  }
  const fn = map[arg];
  if (!fn) {
    console.error(`Unknown verify: ${arg}`);
    process.exit(1);
  }
  fn();
}

main();
