/**
 * 이용권·결제 통합 / 원터치 액션 정적 검증
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function main() {
  const saleSvc = read("src/lib/services/gym-membership-sale.service.ts");
  assert.match(saleSvc, /sellMembership/);
  assert.match(saleSvc, /\$transaction/);
  assert.match(saleSvc, /gymReceivable\.create/);
  assert.match(saleSvc, /gymMemberPayment\.create/);
  assert.match(saleSvc, /gymMemberSubscription\.create/);
  assert.match(saleSvc, /correctSubscription/);
  assert.match(saleSvc, /buildTimeline/);
  assert.match(saleSvc, /requireGymPortalWrite/);

  const actions = read("src/features/gym-members/actions.ts");
  assert.match(actions, /sellGymMembershipAction/);
  assert.match(actions, /correctGymMemberSubscriptionAction/);
  assert.match(actions, /cancelGymMemberSubscriptionAction/);
  assert.match(actions, /collectGymMemberReceivableAction/);
  assert.match(actions, /refundGymMemberPaymentAction/);

  const panel = read(
    "src/components/domain/gym-members/GymMemberMembershipPanel.tsx",
  );
  assert.match(panel, /이용권·결제 등록/);
  assert.match(panel, /재등록/);
  assert.match(panel, /연기/);
  assert.match(panel, /정정/);
  assert.match(panel, /환불/);
  assert.match(panel, /추가 수납/);
  assert.match(panel, /처리 이력/);
  assert.match(panel, /sellGymMembershipAction/);
  assert.doesNotMatch(panel, /양도.*onClick/);

  const detailActions = read(
    "src/components/domain/gym-members/GymMemberDetailActions.tsx",
  );
  assert.doesNotMatch(detailActions, /이용권 배정/);
  assert.doesNotMatch(detailActions, /결제 등록/);
  assert.doesNotMatch(detailActions, /assignGymMemberSubscriptionAction/);
  assert.doesNotMatch(detailActions, /createGymMemberPaymentAction/);

  const page = read("src/app/(dashboard)/gym/members/[memberId]/page.tsx");
  assert.match(page, /GymMemberMembershipPanel/);
  assert.match(page, /buildTimeline/);

  const validator = read("src/lib/validators/gym-member.validator.ts");
  assert.match(validator, /gymMembershipSaleSchema/);

  const duration = read("src/lib/gym-member/membership-duration.ts");
  assert.match(duration, /addMembershipDuration/);
  assert.match(saleSvc, /addMembershipDuration/);

  console.log("verify:gym-membership-sale OK");
}

main();
