/**
 * 운영 현황 KPI compact 56px SSOT.
 *
 *   npm run verify:operational-kpi-style
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(rel: string) {
  return readFileSync(rel, "utf8");
}

const ui = read("src/lib/ui/event-management-ui.ts");
assert.match(ui, /h-\[56px]/);
assert.match(ui, /eventManagementStatCardClass/);
assert.match(ui, /eventManagementStatGridAdminClass/);
assert.doesNotMatch(
  ui.slice(ui.indexOf("eventManagementStatCardClass")),
  /eventManagementStatCardClass = `[^`]*p-4/,
);

const metric = read("src/components/shared/MatchonStatCardButton.tsx");
assert.match(metric, /density = "compact"/);
assert.match(metric, /eventManagementStatCardClass/);

const alias = read("src/components/shared/OperationalMetricCard.tsx");
assert.match(alias, /MatchonStatCardButton as OperationalMetricCard/);

const applicants = read(
  "src/components/domain/applications/OrganizerApplicationsSummaryCards.tsx",
);
assert.match(applicants, /MatchonStatCardButton/);
assert.doesNotMatch(applicants, /min-h-\[90px\]|p-4 shadow/);

const field = read(
  "src/components/domain/field-status/FieldStatusSummaryCards.tsx",
);
assert.match(field, /MatchonStatCardButton/);
assert.doesNotMatch(field, /eventManagementStatCardRelaxedClass/);

const admin = read("src/components/domain/admin/AdminStatsCards.tsx");
assert.match(admin, /OperationalMetricCard/);
assert.match(admin, /eventManagementStatGridAdminClass/);
assert.doesNotMatch(admin, /matchonStatCardClass/);
assert.doesNotMatch(admin, /density="relaxed"/);

const gymField = read(
  "src/components/domain/field-status/GymFieldStatusSummaryCards.tsx",
);
assert.match(gymField, /MatchonStatCardButton/);

const court = read(
  "src/components/domain/field-status/CourtFieldStatusSummaryCards.tsx",
);
assert.match(court, /MatchonStatCardButton/);

const sales = read(
  "src/components/domain/gym-sales/GymSalesDashboardPanel.tsx",
);
assert.match(sales, /matchonStatCardClass/);

console.log("verify:operational-kpi-style: OK");
