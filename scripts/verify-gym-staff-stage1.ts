/**
 * Stage 1: gym member private profile image + GymStaff contracts (static).
 *
 *   npm run verify:gym-member-profile-image
 *   npm run verify:gym-member-image-private-storage
 *   npm run verify:gym-staff-schema
 *   npm run verify:gym-staff-account-setup
 *   npm run verify:gym-staff-permissions
 *   npm run verify:gym-staff-member-assignment
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  const path = join(root, rel);
  assert.ok(existsSync(path), `missing: ${rel}`);
  return readFileSync(path, "utf8");
}

function assertIncludes(src: string, needle: string, label: string) {
  assert.ok(
    src.includes(needle),
    `${label}: expected ${JSON.stringify(needle)}`,
  );
}

function assertNotIncludes(src: string, needle: string, label: string) {
  assert.equal(
    src.includes(needle),
    false,
    `${label}: must not include ${JSON.stringify(needle)}`,
  );
}

function verifyMemberProfileImage() {
  const constants = read("src/lib/constants/gym-member-image-upload.ts");
  const service = read("src/lib/services/gym-member-image.service.ts");
  const upload = read("src/components/domain/gym-members/GymMemberProfileImageUpload.tsx");
  const avatar = read("src/components/domain/gym-members/GymMemberAvatar.tsx");
  const api = read("src/app/api/uploads/gym-member-image/route.ts");
  const schema = read("prisma/schema.prisma");

  assertIncludes(constants, "gym-member-images", "bucket default");
  assertIncludes(constants, "GYM_MEMBER_IMAGE_MAX_BYTES", "max bytes");
  assertIncludes(service, "createSignedUploadUrl", "signed upload");
  assertIncludes(service, "createSignedUrl", "signed read");
  assertNotIncludes(service, "object/public", "no public URL builder");
  assertIncludes(upload, "createObjectURL", "local preview");
  assertIncludes(upload, "제거 예정", "marked remove");
  assertIncludes(avatar, "charAt(0)", "initial placeholder");
  assertIncludes(api, "createGymMemberImageUploadUrl", "api wires service");
  assertIncludes(schema, "profileImagePath", "GymMember path field");
  const memberBlock = schema.slice(
    schema.indexOf("model GymMember {"),
    schema.indexOf("model GymAttendanceKiosk {"),
  );
  assertNotIncludes(
    memberBlock,
    "profileImageUrl",
    "GymMember must not store public URL",
  );
  console.log("verify:gym-member-profile-image: OK");
}

function verifyPrivateStorage() {
  const constants = read("src/lib/constants/gym-member-image-upload.ts");
  const service = read("src/lib/services/gym-member-image.service.ts");
  const fighterUpload = read("src/lib/services/upload.service.ts");

  assertIncludes(constants, "gym-member-images", "private bucket name");
  assertIncludes(service, "assertGymMemberImagePath", "path scope");
  assertIncludes(fighterUpload, "profile-images", "fighter stays public");
  assertNotIncludes(
    service,
    "buildPublicStorageUrlForProfileImages",
    "member image must not use fighter public helper",
  );
  console.log("verify:gym-member-image-private-storage: OK");
}

function verifyStaffSchema() {
  const schema = read("prisma/schema.prisma");
  const sql = read(
    "prisma/migrations_manual/20260730_gym_staff_member_images.sql",
  );

  assertIncludes(schema, "gym_staff", "UserRole");
  assertIncludes(schema, "model GymStaff {", "GymStaff model");
  assertIncludes(schema, "model GymStaffMemberAssignment {", "assignment");
  assertIncludes(schema, "model GymStaffAccountSetupToken {", "setup token");
  assertIncludes(schema, "model GymStaffPasswordResetToken {", "reset token");
  assertIncludes(schema, "gym_staff_account_setup_link_created", "audit");
  assertIncludes(sql, "CREATE TABLE IF NOT EXISTS \"GymStaff\"", "SQL table");
  const sqlWithoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.equal(/\bDROP\s+TABLE\b/i.test(sqlWithoutComments), false, "no DROP");
  assert.equal(
    /\bSET\s+NOT\s+NULL\b/i.test(sqlWithoutComments),
    false,
    "no SET NOT NULL in SQL statements",
  );
  assert.equal(
    /accept-data-loss/i.test(sqlWithoutComments),
    false,
    "no data loss flag in SQL statements",
  );
  console.log("verify:gym-staff-schema: OK");
}

function verifyStaffAccountSetup() {
  const token = read("src/lib/gym-staff-account/token.ts");
  const rate = read("src/lib/gym-staff-account/rate-limit.ts");
  const service = read("src/lib/services/gym-staff-account-setup.service.ts");
  const actions = read("src/features/gym-staff-account/actions.ts");
  const panel = read("src/components/domain/gym-staff/GymStaffAccountPanel.tsx");
  const setupPage = read(
    "src/app/(public)/gym-staff/account/setup/[token]/page.tsx",
  );
  const resetPage = read(
    "src/app/(public)/gym-staff/password/reset/[token]/page.tsx",
  );

  assertIncludes(token, "GYM_STAFF_ACCOUNT_SETUP_TTL_MS", "setup ttl");
  assertIncludes(token, "GYM_STAFF_PASSWORD_RESET_TTL_MS", "reset ttl");
  assertIncludes(token, "sha256", "hash");
  assertIncludes(token, "/gym-staff/account/setup/", "setup url");
  assertIncludes(token, "/gym-staff/password/reset/", "reset url");
  assertIncludes(rate, "staff-setup:", "rate key");
  assertIncludes(service, "tokenHash", "hash only");
  assertIncludes(service, "UserRole.gym_staff", "role on create");
  assertIncludes(service, "mustChangePassword: false", "self setup");
  assertNotIncludes(service, "temporaryPassword", "no temp password");
  assertIncludes(actions, "createGymStaffAccountSetupLinkAction", "actions");
  assertIncludes(panel, "계정 설정 링크 만들기", "owner UI");
  assertNotIncludes(panel, "임시 비밀번호", "no temp pw UI");
  assertIncludes(setupPage, "GymStaffAccountSetupForm", "setup page");
  assertIncludes(resetPage, "GymStaffPasswordResetForm", "reset page");
  console.log("verify:gym-staff-account-setup: OK");
}

function verifyStaffPermissions() {
  const access = read("src/lib/gym-portal-access.ts");
  const permissions = read("src/lib/permissions.ts");
  const nav = read("src/lib/navigation/gym-portal-navigation.ts");
  const layout = read("src/app/(dashboard)/gym/layout.tsx");
  const map = read("src/lib/auth/map-profile-to-actor.ts");

  assertIncludes(permissions, "requireGymStaff", "helper");
  assertIncludes(permissions, "isGymPortalOwner", "owner helper");
  assertIncludes(access, "gym_staff", "access mode");
  assertIncludes(access, "canManageStaff: false", "staff blocked manage");
  assertIncludes(access, "canManageSales: false", "staff blocked sales");
  assertIncludes(nav, "GymPortalNavViewer", "viewer");
  assertIncludes(nav, '"staff"', "staff viewer");
  assertIncludes(layout, "gym_staff", "layout allows staff");
  assertIncludes(map, "gymStaffId", "actor staff id");
  console.log("verify:gym-staff-permissions: OK");
}

function verifyAssignment() {
  const service = read("src/lib/services/gym-staff.service.ts");
  const panel = read("src/components/domain/gym-staff/GymStaffAssignmentPanel.tsx");
  const schema = read("prisma/schema.prisma");

  assertIncludes(schema, "isPrimary", "primary field");
  assertIncludes(service, "isPrimary", "primary policy");
  assertIncludes(service, "assignMember", "assign");
  assertIncludes(panel, "담당", "UI");
  console.log("verify:gym-staff-member-assignment: OK");
}

function main() {
  const focus = process.argv[2] ?? "all";
  if (focus === "all" || focus === "profile-image") verifyMemberProfileImage();
  if (focus === "all" || focus === "private-storage") verifyPrivateStorage();
  if (focus === "all" || focus === "schema") verifyStaffSchema();
  if (focus === "all" || focus === "account-setup") verifyStaffAccountSetup();
  if (focus === "all" || focus === "permissions") verifyStaffPermissions();
  if (focus === "all" || focus === "assignment") verifyAssignment();
  if (focus === "all") {
    console.log("ALL verify:gym-member/staff Stage1 OK");
  }
}

main();
