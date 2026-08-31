/**
 * 회원사 가입 신청 UX 단순화 정적 검증.
 * - 글로벌 메뉴에 가입 링크 없음
 * - 안정 URL 서명 재구성
 * - 직접 등록 validator / 접수 source 라벨
 */
import assert from "node:assert/strict";
import { getOrganizerGlobalNavGroups } from "../src/lib/navigation/organizer-global-navigation";
import {
  buildStableMemberGymJoinToken,
  DEFAULT_MEMBER_GYM_JOIN_LINK_LABEL,
  parseStableMemberGymJoinToken,
} from "../src/lib/member-gym/join-link-url";
import {
  memberGymManualApplicationSchema,
} from "../src/lib/validators/member-gym.validator";
import { resolveMemberGymApplicationSourceLabel } from "../src/lib/ui-labels/member-gym";
import { AssociationMemberGymApplicationSource } from "../src/lib/enums";

function main() {
  const groups = getOrganizerGlobalNavGroups({ organizerType: "association" });
  const member = groups.find((g) => g.id === "member-gyms");
  assert.ok(member);
  assert.deepEqual(
    member!.items.map((i) => i.label),
    [
      "회원사 현황",
      "가입 신청",
      "연결 요청",
      "회원사 목록",
      "환경 설정",
      "공지사항",
    ],
  );
  assert.ok(!member!.items.some((i) => i.href.includes("/links")));

  const id = "cuidmembergymlink01";
  const token = buildStableMemberGymJoinToken(id);
  assert.equal(parseStableMemberGymJoinToken(token)?.linkId, id);
  assert.equal(DEFAULT_MEMBER_GYM_JOIN_LINK_LABEL, "기본 회원사 가입 링크");

  const parsed = memberGymManualApplicationSchema.safeParse({
    receptionChannel: "paper",
    gymName: "테스트관",
    ownerName: "홍길동",
    phone: "01012345678",
    email: "owner@example.com",
    gymAddress: "서울",
    paperConsentConfirmed: true,
  });
  assert.equal(parsed.success, true);

  assert.equal(
    resolveMemberGymApplicationSourceLabel(
      AssociationMemberGymApplicationSource.paper,
    ),
    "종이",
  );
  assert.equal(
    resolveMemberGymApplicationSourceLabel(null, "link1"),
    "온라인",
  );
  assert.equal(resolveMemberGymApplicationSourceLabel(null, null), "직접 입력");

  console.log("verify-member-gym-applications-ux: ALL PASS");
}

main();
