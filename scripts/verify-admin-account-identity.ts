/**
 * Admin loginId display + requestedLoginId + optional password_help verifies.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model User[\s\S]*loginId\s+String\?\s+@unique/);
  assert.match(schema, /model DesktopSupportInquiry[\s\S]*loginId\s+String\?/);
  assert.match(
    schema,
    /model AssociationApplication[\s\S]*requestedLoginId\s+String\?/,
  );
  assert.match(schema, /model GymApplication[\s\S]*requestedLoginId\s+String\?/);

  const migration = read(
    "prisma/migrations/20260805120000_application_requested_login_id/migration.sql",
  );
  assert.match(migration, /AssociationApplication/);
  assert.match(migration, /requestedLoginId/);
  assert.match(migration, /GymApplication/);
  assert.doesNotMatch(migration, /NOT NULL/);

  const inquirySvc = read("src/lib/services/desktop-support-inquiry.service.ts");
  assert.match(inquirySvc, /loginIdSchema/);
  assert.doesNotMatch(
    inquirySvc,
    /비밀번호 찾기 문의는 로그인 아이디를 입력해 주세요/,
  );

  const modal = read(
    "src/components/domain/desktop/DesktopSupportInquiryModal.tsx",
  );
  assert.match(modal, /로그인 아이디 \(선택\)/);
  assert.match(modal, /기억나지 않는 경우/);
  assert.doesNotMatch(modal, /required=\{loginIdRequired\}/);

  const assocSvc = read("src/lib/services/association-application.service.ts");
  assert.match(assocSvc, /requestedLoginId/);
  assert.match(assocSvc, /parseRequiredRequestedLoginId/);
  assert.match(assocSvc, /assertApplicationRequestedLoginIdAvailable/);
  assert.match(assocSvc, /loginId: requestedLoginId/);

  const gymSvc = read("src/lib/services/gym-application.service.ts");
  assert.match(gymSvc, /requestedLoginId/);
  assert.match(gymSvc, /parseRequiredRequestedLoginId/);
  assert.match(gymSvc, /loginId: requestedLoginId \?\? `pending-gym-/);

  const uniq = read("src/lib/services/application-requested-login-id.ts");
  assert.match(uniq, /BLOCKING_ASSOCIATION_STATUSES/);
  assert.match(uniq, /BLOCKING_GYM_STATUSES/);
  assert.match(uniq, /assertApplicationRequestedLoginIdAvailable/);
  assert.match(uniq, /pg_advisory_xact_lock/);
  assert.match(uniq, /app-login-id:/);

  const joinApi = read("src/app/api/public/join/check-login-id/route.ts");
  assert.match(joinApi, /checkApplicationRequestedLoginIdAvailability/);

  const assocForm = read(
    "src/components/domain/association-applications/AssociationApplicationForm.tsx",
  );
  assert.match(assocForm, /RequestedLoginIdField/);

  const loginIdField = read(
    "src/components/domain/auth/RequestedLoginIdField.tsx",
  );
  assert.match(loginIdField, /희망 로그인 아이디/);
  assert.match(loginIdField, /승인 후 로그인에 사용할 아이디입니다/);

  const gymForm = read("src/components/domain/gym-join/GymJoinApplicationForm.tsx");
  assert.match(gymForm, /RequestedLoginIdField/);

  const assocDetail = read(
    "src/app/(dashboard)/admin/association-applications/[applicationId]/page.tsx",
  );
  assert.match(assocDetail, /신청 로그인 아이디/);
  assert.match(assocDetail, /현재 로그인 아이디/);
  assert.match(
    assocDetail,
    /계정이 아직 활성화되지 않아 비밀번호 재설정 링크를 발급할 수/,
  );
  assert.match(assocDetail, /없습니다\./);

  const gymDetail = read(
    "src/app/(dashboard)/admin/gym-applications/[applicationId]/page.tsx",
  );
  assert.match(gymDetail, /신청 로그인 아이디/);
  assert.match(
    gymDetail,
    /계정이 아직 활성화되지 않아 비밀번호 재설정 링크를 발급할 수/,
  );
  assert.match(gymDetail, /없습니다\./);

  const panel = read(
    "src/components/domain/admin/AdminPasswordResetLinkPanel.tsx",
  );
  assert.match(panel, /userId: target\.userId/);
  assert.doesNotMatch(panel, /authUserId/);

  const inviteAssoc = read(
    "src/components/domain/association-applications/AssociationOwnerInviteAcceptForm.tsx",
  );
  assert.match(inviteAssoc, /lockedLoginId/);

  const inviteGym = read(
    "src/components/domain/gym-applications/GymApplicationInviteAcceptForm.tsx",
  );
  assert.match(inviteGym, /lockedLoginId/);

  console.log("verify-admin-account-identity: ok");
}

main();
