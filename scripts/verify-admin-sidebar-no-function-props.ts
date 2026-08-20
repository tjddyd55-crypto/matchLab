/**
 * Guard: Server Sidebar must not pass function props into Client nav.
 *   npx tsx scripts/verify-admin-sidebar-no-function-props.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sidebar = readFileSync(
  join(process.cwd(), "src/components/layout/Sidebar.tsx"),
  "utf8",
);

assert.ok(
  !sidebar.includes("isItemActive={isAdminNavItemActive}"),
  "Sidebar must not pass isAdminNavItemActive into Client Component",
);
assert.ok(
  !sidebar.includes("isItemActive={isFighterNavItemActive}"),
  "Sidebar must not pass isFighterNavItemActive into Client Component",
);
assert.ok(
  sidebar.includes("<SidebarNav"),
  "admin branch should use SidebarNav client wrapper",
);
assert.ok(
  sidebar.includes("<FighterSidebarNav"),
  "fighter branch should use FighterSidebarNav client wrapper",
);

console.log("verify-admin-sidebar-no-function-props: PASS");
