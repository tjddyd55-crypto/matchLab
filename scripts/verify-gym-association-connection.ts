/**
 * 협회 연결 요청 모델·복수 가입·포털 게이트·서비스 SSOT 검증.
 *   npm run verify:gym-association-connection
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AssociationMemberGymStatus } from "../src/lib/enums";
import {
  decideGymPortalAccessFromMembership,
  pickMembershipForPortalGate,
} from "../src/lib/member-gym/portal-membership-gate";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertSchema() {
  const schema = read("prisma/schema.prisma");
  assert.ok(schema.includes("model AssociationGymConnectionRequest"));
  assert.ok(schema.includes("model AssociationMemberGym"));
  assert.ok(schema.includes("AssociationGymConnectionRequestStatus"));
  assert.ok(schema.includes("@@unique([organizerId, gymId])"));
  assert.equal(schema.includes("associationId String"), false);
  assert.ok(!schema.includes("model GymAssociationMembership"));
  console.log("verify:gym-association-connection: schema OK");
}

function assertPortalGatePick() {
  const now = new Date();
  const earlier = new Date(now.getTime() - 60_000);

  assert.equal(pickMembershipForPortalGate([]), null);

  assert.equal(
    pickMembershipForPortalGate([
      {
        status: AssociationMemberGymStatus.withdrawn,
        ownerAccessSuspendedAt: null,
        updatedAt: now,
      },
    ]),
    null,
  );

  const active = {
    id: "a",
    status: AssociationMemberGymStatus.active,
    ownerAccessSuspendedAt: null,
    updatedAt: earlier,
  };
  const withdrawnNewer = {
    id: "b",
    status: AssociationMemberGymStatus.withdrawn,
    ownerAccessSuspendedAt: null,
    updatedAt: now,
  };
  const picked = pickMembershipForPortalGate([withdrawnNewer, active]);
  assert.equal(picked?.id, "a");

  const withdrawnDecision = decideGymPortalAccessFromMembership({
    status: AssociationMemberGymStatus.withdrawn,
    ownerAccessSuspendedAt: null,
  });
  assert.equal(withdrawnDecision.accessMode, "normal_gym");
  assert.equal(withdrawnDecision.canEnterPortal, true);

  const pendingOnly = decideGymPortalAccessFromMembership({
    status: AssociationMemberGymStatus.pending,
    ownerAccessSuspendedAt: null,
  });
  assert.equal(pendingOnly.canEnterPortal, true);
  assert.equal(pendingOnly.canCreateFighter, true);

  const activeA = {
    id: "active",
    status: AssociationMemberGymStatus.active,
    ownerAccessSuspendedAt: null,
    updatedAt: now,
  };
  const withdrawnB = {
    id: "wd",
    status: AssociationMemberGymStatus.withdrawn,
    ownerAccessSuspendedAt: null,
    updatedAt: earlier,
  };
  assert.equal(
    pickMembershipForPortalGate([activeA, withdrawnB])?.id,
    "active",
  );

  console.log("verify:gym-association-connection: portal gate OK");
}

function assertServiceAndUiWiring() {
  const service = read(
    "src/lib/services/gym-association-connection.service.ts",
  );
  assert.match(service, /requestConnection/);
  assert.match(service, /approveRequest/);
  assert.match(service, /rejectRequest/);
  assert.match(service, /disconnectMembership/);
  assert.match(service, /disconnectByAssociation/);
  assert.match(service, /listAvailableAssociations/);
  assert.match(service, /이미 해당 협회에 가입되어 있습니다/);

  const actions = read("src/features/gym-association-connection/actions.ts");
  assert.match(actions, /requestGymAssociationMembershipAction/);
  assert.match(actions, /approveGymAssociationMembershipAction/);

  const gymPage = read("src/app/(dashboard)/gym/associations/page.tsx");
  assert.match(gymPage, /GymAssociationMembershipPanel/);

  const orgPage = read(
    "src/app/(dashboard)/organizer/member-gyms/connection-requests/page.tsx",
  );
  assert.match(orgPage, /AssociationGymConnectionRequestPanel/);

  const gymNav = read("src/lib/navigation/gym-portal-navigation.ts");
  assert.match(gymNav, /\/gym\/associations/);
  assert.match(gymNav, /가입 협회/);

  const repo = read("src/lib/repositories/member-gym.repository.ts");
  assert.match(repo, /pickMembershipForPortalGate/);

  console.log("verify:gym-association-connection: wiring OK");
}

function main() {
  assertSchema();
  assertPortalGatePick();
  assertServiceAndUiWiring();
  console.log("verify:gym-association-connection: ALL_PASS");
}

main();
