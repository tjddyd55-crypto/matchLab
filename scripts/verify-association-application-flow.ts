/**
 * 협회 가입 신청·초대 활성화 정적 검증.
 *   npm run verify:association-application-flow
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const schema = read("prisma/schema.prisma");
  assert.ok(schema.includes("model AssociationApplication"));
  assert.ok(schema.includes("model AssociationApplicationAttachment"));
  assert.ok(schema.includes("ownerInviteTokenHash"));
  assert.ok(schema.includes("@unique"));
  assert.equal(schema.includes("ownerInviteToken String"), false);

  const svc = read("src/lib/services/association-application.service.ts");
  assert.ok(svc.includes("acceptOwnerInvite"));
  assert.ok(svc.includes("buildAssociationOwnerInviteUrl"));
  assert.ok(svc.includes("loginIdToAuthEmail"));
  assert.ok(svc.includes("attachments"));
  assert.equal(svc.includes("tempPassword"), false);
  assert.equal(svc.includes("randomPassword"), false);

  assert.ok(
    existsSync(
      join(root, "src/app/(public)/association-owner-invite/[token]/page.tsx"),
    ),
  );
  assert.ok(
    existsSync(join(root, "src/app/(public)/join/association/page.tsx")),
  );
  assert.ok(
    existsSync(
      join(root, "src/app/api/uploads/association-application/route.ts"),
    ),
  );
  assert.ok(
    existsSync(
      join(root, "src/components/domain/organizer/AssociationPublicLogoForm.tsx"),
    ),
  );

  const form = read(
    "src/components/domain/association-applications/AssociationOwnerInviteAcceptForm.tsx",
  );
  assert.ok(form.includes("/login?activated=1&loginId="));
  assert.ok(form.includes("window.location.assign"));

  const appForm = read(
    "src/components/domain/association-applications/AssociationApplicationForm.tsx",
  );
  assert.ok(appForm.includes("/api/uploads/association-application"));
  assert.ok(appForm.includes("attachmentsJson"));

  const hub = read("src/app/(public)/join/page.tsx");
  assert.ok(hub.includes("/join/association"));

  const nav = read("src/lib/navigation/admin-navigation.ts");
  assert.ok(nav.includes("/admin/association-applications"));

  console.log("verify:association-application-flow: OK");
}

main();
