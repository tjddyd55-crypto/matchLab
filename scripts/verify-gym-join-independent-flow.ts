/**
 * 체육관 독립 가입·폼 SSOT·용어·첨부 UI 정적 검증.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const hub = read("src/app/(public)/join/page.tsx");
  assert.ok(hub.includes("체육관"));
  assert.ok(hub.includes("/join/gym"));
  assert.equal(hub.includes("회원사"), false);
  assert.equal(hub.includes("대회 주최자"), false);

  const gym = read("src/app/(public)/join/gym/page.tsx");
  assert.ok(gym.includes("GymJoinApplicationForm"));
  assert.ok(gym.includes('mode="independent"'));
  assert.equal(gym.includes("listJoinableAssociations"), false);
  assert.equal(gym.includes("가입할 협회"), false);
  assert.equal(gym.includes("회원사 가입 가능"), false);
  assert.equal(gym.includes("대회 주최자"), false);
  assert.equal(gym.includes("가입 신청</Link>"), false);

  const form = read(
    "src/components/domain/gym-join/GymJoinApplicationForm.tsx",
  );
  assert.ok(form.includes('mode: "independent" | "association_invite"'));
  assert.ok(form.includes("AddressSearchField"));
  assert.ok(form.includes("DocumentUploadField"));
  assert.ok(form.includes("postalName"));
  assert.ok(form.includes("1. 계정 정보"));
  assert.ok(form.includes("2. 체육관 정보"));
  assert.match(
    form,
    /1\. 계정 정보[\s\S]*RequestedLoginIdField[\s\S]*2\. 체육관 정보/,
  );
  assert.doesNotMatch(form, /\.open\(\)/);
  assert.ok(form.includes("/api/uploads/gym-application"));
  assert.ok(form.includes("/api/uploads/member-gym-application"));
  assert.equal(form.includes("private storage"), false);
  assert.equal(form.includes('type="file"'), false);
  assert.ok(form.includes("체육관 가입 신청에 동의합니다"));
  assert.equal(form.includes("회원자격 신청"), false);
  assert.equal(form.includes("회원사"), false);

  const invitePage = read(
    "src/app/(public)/member-gym-register/[token]/page.tsx",
  );
  assert.ok(invitePage.includes("GymJoinApplicationForm"));
  assert.ok(invitePage.includes("association_invite"));
  assert.equal(invitePage.includes("회원사 가입"), false);

  const service = read("src/lib/services/gym-application.service.ts");
  assert.ok(service.includes("associationMemberGymCreated: false"));
  assert.equal(service.includes("associationMemberGym.create"), false);
  assert.ok(service.includes("applicant_signature"));
  assert.ok(service.includes("normalizePostalCode"));

  const schema = read("prisma/schema.prisma");
  assert.ok(schema.includes("model GymApplication"));
  assert.ok(schema.includes("postalCode"));
  assert.ok(schema.includes("gymPostalCode"));
  assert.ok(schema.includes("homePostalCode"));
  assert.ok(schema.includes("model AssociationGymConnectionRequest"));

  assert.ok(
    existsSync(join(root, "src/app/api/uploads/gym-application/route.ts")),
  );
  assert.ok(
    existsSync(
      join(root, "src/app/(dashboard)/admin/gym-applications/page.tsx"),
    ),
  );

  const adminDetail = read(
    "src/app/(dashboard)/admin/gym-applications/[applicationId]/page.tsx",
  );
  assert.ok(adminDetail.includes("협회 연결 없음"));
  assert.ok(adminDetail.includes("formatPostalAddress"));

  console.log("verify:gym-join-independent-flow: OK");
}

main();
