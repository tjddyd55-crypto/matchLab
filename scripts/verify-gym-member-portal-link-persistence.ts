/**
 * 회원 전용 페이지 공용 링크 지속 표시·복사 정적 검증.
 * Usage: tsx scripts/verify-gym-member-portal-link-persistence.ts [focus]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const focus = process.argv[2] ?? "all";

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertIncludes(hay: string, needle: string, label: string) {
  assert.ok(hay.includes(needle), `missing ${label}: ${needle}`);
}

function assertNotIncludes(hay: string, needle: string, label: string) {
  assert.ok(!hay.includes(needle), `unexpected ${label}: ${needle}`);
}

function verifyPersistence() {
  const schema = read("prisma/schema.prisma");
  assertIncludes(schema, "publicToken", "schema publicToken");
  assertIncludes(schema, "publicTokenHash", "schema hash");
  const migration = read(
    "prisma/migrations/20260805180000_gym_member_portal_public_token/migration.sql",
  );
  assertIncludes(migration, 'ADD COLUMN IF NOT EXISTS "publicToken"', "add col");
  assert.doesNotMatch(migration, /\bDROP\b|\bTRUNCATE\b/i);
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "mapOwnerPortalLink", "owner map");
  assertIncludes(service, "hasDisplayableLink", "displayable");
  assertIncludes(service, "isLegacyHashOnly", "legacy");
  assertIncludes(service, "getAppBaseUrl()", "app url");
  console.log("verify:gym-member-portal-link-persistence: OK");
}

function verifyRepeatCopy() {
  const ui = read(
    "src/components/domain/gym-member-portal/GymMemberPortalOwnerManager.tsx",
  );
  assertIncludes(ui, "resolveDisplayUrl", "display url");
  assertIncludes(ui, "copyToClipboard", "clipboard helper");
  assertIncludes(ui, "document.execCommand(\"copy\")", "fallback");
  assertIncludes(ui, "회원 전용 페이지 링크를 복사했습니다.", "copy toast");
  assertIncludes(ui, "initialPortal", "server initial");
  assertNotIncludes(ui, "freshLink", "no one-shot freshLink state");
  console.log("verify:gym-member-portal-link-repeat-copy: OK");
}

function verifyRotation() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "rotatePortalToken", "rotate");
  assertIncludes(service, "isActive: false", "deactivate old");
  assertIncludes(service, "publicToken: rawToken", "new public token");
  const ui = read(
    "src/components/domain/gym-member-portal/GymMemberPortalOwnerManager.tsx",
  );
  assertIncludes(ui, 'confirmKind === "rotate"', "rotate confirm");
  assertIncludes(ui, "dismissible={false}", "no outside dismiss");
  assertIncludes(
    ui,
    "기존 링크는 즉시 사용할 수 없게 됩니다.",
    "rotate warn",
  );
  console.log("verify:gym-member-portal-link-rotation: OK");
}

function verifyDisable() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "revokePortal", "revoke");
  assertIncludes(service, "gym_member_portal_revoked", "audit");
  const ui = read(
    "src/components/domain/gym-member-portal/GymMemberPortalOwnerManager.tsx",
  );
  assertIncludes(ui, 'confirmKind === "revoke"', "revoke confirm");
  assertIncludes(ui, "회원 전용 페이지 시작", "restart CTA");
  assertIncludes(
    ui,
    "기존 링크로 더 이상 접속할 수 없습니다.",
    "disable warn",
  );
  console.log("verify:gym-member-portal-link-disable: OK");
}

function verifyGymScope() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "requireGymPortalOwnerManage", "owner manage");
  assertIncludes(service, "gymId: access.gymId", "gym scope");
  assertIncludes(service, "resolvePortal", "member resolve");
  assertIncludes(service, "verifyIdentityAndCreateSession", "identity");
  console.log("verify:gym-member-portal-link-gym-scope: OK");
}

function verifyAppUrl() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, 'from "@/lib/app-url"', "import app url");
  assertIncludes(service, "getAppBaseUrl()", "base url");
  assertNotIncludes(service, "window.location.origin", "no window origin in svc");
  console.log("verify:gym-member-portal-link-app-url: OK");
}

function verifyLegacy() {
  const ui = read(
    "src/components/domain/gym-member-portal/GymMemberPortalOwnerManager.tsx",
  );
  assertIncludes(ui, "isLegacyHashOnly", "legacy flag");
  assertIncludes(
    ui,
    "기존 링크는 보안 정책상 다시 표시할 수 없습니다.",
    "legacy msg",
  );
  assertIncludes(ui, "공용 링크 새로 발급", "legacy rotate CTA");
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "isLegacyHashOnly: !hasDisplayableLink", "legacy map");
  console.log("verify:gym-member-portal-link-legacy: OK");
}

const runners: Record<string, () => void> = {
  persistence: verifyPersistence,
  "repeat-copy": verifyRepeatCopy,
  rotation: verifyRotation,
  disable: verifyDisable,
  "gym-scope": verifyGymScope,
  "app-url": verifyAppUrl,
  legacy: verifyLegacy,
};

if (focus === "all") {
  for (const fn of Object.values(runners)) fn();
  console.log("verify:gym-member-portal-link-persistence-suite: ALL OK");
} else {
  const fn = runners[focus];
  if (!fn) {
    console.error(`Unknown focus: ${focus}`);
    process.exit(1);
  }
  fn();
}
