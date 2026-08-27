/**
 * Gym multi-association notice menu SSOT.
 *   npm run verify:gym-association-notice-menu
 *   npm run verify:gym-multi-association-notices
 */
import assert from "node:assert/strict";
import {
  getGymPortalNavGroups,
  isGymPortalNavItemActive,
} from "../src/lib/navigation/gym-portal-navigation";

function main() {
  const zero = getGymPortalNavGroups("owner", []);
  assert.equal(
    zero.some((g) => g.id === "associations"),
    false,
    "0 associations → no 협회 section",
  );

  const one = getGymPortalNavGroups("owner", [
    { associationId: "assoc-a", name: "대한격투기협회" },
  ]);
  const oneSection = one.find((g) => g.id === "associations");
  assert.ok(oneSection);
  assert.equal(oneSection!.branches?.length, 1);
  assert.equal(oneSection!.branches?.[0]?.items[0]?.label, "공지사항");
  assert.equal(
    oneSection!.branches?.[0]?.items[0]?.href,
    "/gym/associations/assoc-a/notices",
  );

  const multi = getGymPortalNavGroups("owner", [
    { associationId: "assoc-a", name: "대한격투기협회" },
    { associationId: "assoc-b", name: "서울시격투기협회" },
    { associationId: "assoc-c", name: "마포구격투기협회" },
  ]);
  const multiSection = multi.find((g) => g.id === "associations");
  assert.equal(multiSection?.branches?.length, 3);
  assert.deepEqual(
    multiSection?.branches?.map((b) => b.id),
    ["assoc-a", "assoc-b", "assoc-c"],
  );

  assert.equal(
    isGymPortalNavItemActive(
      "/gym/associations/assoc-a/notices",
      "/gym/associations/assoc-a/notices/n1",
    ),
    true,
  );
  assert.equal(
    isGymPortalNavItemActive(
      "/gym/associations",
      "/gym/associations/assoc-a/notices",
    ),
    false,
  );

  const staff = getGymPortalNavGroups("staff", [
    { associationId: "assoc-a", name: "대한격투기협회" },
  ]);
  assert.ok(staff.some((g) => g.id === "associations"));

  console.log("verify:gym-association-notice-menu OK");
  console.log("verify:gym-multi-association-notices OK");
}

main();
