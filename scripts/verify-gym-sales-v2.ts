/**
 * 체육관 매출 V2 — 구조/스코프 정적 검증
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model GymProduct/);
  assert.match(schema, /enum GymProductCategory/);
  assert.match(schema, /productId\s+String\?/);
  assert.match(schema, /GymSalesCategory[\s\S]*locker/);

  const calc = read("src/lib/gym-sales/calc.ts");
  assert.match(calc, /case "locker"/);

  const salesSvc = read("src/lib/services/gym-sales.service.ts");
  assert.match(salesSvc, /createSalesEntry/);
  assert.match(salesSvc, /listSalesEntries/);
  assert.match(salesSvc, /requireGymPortalSalesManage/);
  assert.match(salesSvc, /productId/);

  const productSvc = read("src/lib/services/gym-product.service.ts");
  assert.match(productSvc, /requireGymPortalSalesManage/);
  assert.match(productSvc, /listProducts/);
  assert.match(productSvc, /reorderProducts/);

  const nav = read("src/lib/navigation/gym-portal-navigation.ts");
  assert.match(nav, /매출 등록/);
  assert.match(nav, /상품 관리/);
  assert.doesNotMatch(nav, /\{ href: "\/gym\/sales\/receivables", label: "미수금" \}/);

  const dash = read("src/components/domain/gym-sales/GymSalesDashboardPanel.tsx");
  assert.doesNotMatch(dash, /수기 매출 등록/);
  assert.doesNotMatch(dash, /createGymManualSaleAction/);

  const salesPage = read("src/app/(dashboard)/gym/sales/page.tsx");
  assert.match(salesPage, /GymSalesRegisterCta/);
  assert.match(salesPage, /매출 현황/);

  const entryPage = read("src/app/(dashboard)/gym/sales/receivables/page.tsx");
  assert.match(entryPage, /매출 등록/);
  assert.match(entryPage, /GymSalesEntryPanel/);
  assert.match(entryPage, /listSalesEntries/);

  const productsPage = read("src/app/(dashboard)/gym/products/page.tsx");
  assert.match(productsPage, /GymProductsManager/);

  const modal = read("src/components/domain/gym-sales/SalesEntryModal.tsx");
  assert.match(modal, /createGymSalesEntryAction/);
  assert.match(modal, /saleAmount/);
  assert.match(modal, /paidAmount/);
  assert.match(modal, /max-md:bottom-0/);

  const entryPanel = read("src/components/domain/gym-sales/GymSalesEntryPanel.tsx");
  assert.match(entryPanel, /SalesEntryModal/);
  assert.match(entryPanel, /collectGymReceivableAction/);

  const salesActions = read("src/features/gym-sales/actions.ts");
  assert.match(salesActions, /createGymSalesEntryAction/);
  assert.match(salesActions, /requireActorFromMutation/);

  const productActions = read("src/features/gym-products/actions.ts");
  assert.match(productActions, /createGymProductAction/);
  assert.match(productActions, /requireActorFromMutation/);

  console.log("verify:gym-sales-v2 OK");
}

main();
