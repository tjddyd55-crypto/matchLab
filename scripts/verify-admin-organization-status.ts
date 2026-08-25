/**
 * Phase 2-1: Organization platform status — static verification.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GymStatus,
  OrganizerStatus,
  AuditAction,
} from "../src/generated/prisma";
import {
  isMutableGymStatusTransition,
  isMutableOrganizerStatusTransition,
  isOrganizerFieldOperationsEventStatus,
} from "../src/lib/organization-platform-status";
import { EventStatus } from "../src/lib/enums";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertSchemaAuditActions() {
  const schema = read("prisma/schema.prisma");
  for (const action of ["organizer_status_changed", "gym_status_changed"]) {
    assert.match(schema, new RegExp(`\\s${action}\\s`));
    assert.equal(AuditAction[action as keyof typeof AuditAction], action);
  }
}

function assertOrganizerPortalAccessModule() {
  const src = read("src/lib/organizer-portal-access.ts");
  assert.match(src, /resolveOrganizerPortalAccess/);
  assert.match(src, /requireOrganizerPortalGeneralWrite/);
  assert.match(src, /field_operations_only/);
}

function assertOrganizerLayoutGate() {
  const layout = read("src/app/(dashboard)/organizer/layout.tsx");
  assert.match(layout, /resolveOrganizerPortalAccess/);
  assert.match(layout, /OrganizerPortalBlockedView/);
  assert.doesNotMatch(layout, /window\.confirm/);
}

function assertGymLayoutReuse() {
  const layout = read("src/app/(dashboard)/gym/layout.tsx");
  assert.match(layout, /resolveGymPortalAccess/);
  assert.doesNotMatch(
    read("src/lib/gym-portal-access.ts"),
    /organizer-portal-access/,
    "gym gate must not duplicate organizer gate file",
  );
}

function assertAdminStatusActions() {
  const actions = read("src/features/admin-organization/actions.ts");
  assert.match(actions, /adminUpdateOrganizerStatusAction/);
  assert.match(actions, /adminUpdateGymStatusAction/);
  const service = read("src/lib/services/admin-organization-status.service.ts");
  assert.match(service, /\$transaction/);
  assert.match(service, /AuditAction\.organizer_status_changed/);
  assert.match(service, /AuditAction\.gym_status_changed/);
}

function assertEventOptionB() {
  assert.equal(
    isOrganizerFieldOperationsEventStatus(EventStatus.bracket_ready),
    true,
  );
  assert.equal(
    isOrganizerFieldOperationsEventStatus(EventStatus.ongoing),
    true,
  );
  assert.equal(isOrganizerFieldOperationsEventStatus(EventStatus.open), false);
  assert.equal(isOrganizerFieldOperationsEventStatus(EventStatus.draft), false);

  const eventService = read("src/lib/services/event.service.ts");
  assert.match(eventService, /requireOrganizerPlatformActiveForWrite/);

  const permissions = read("src/lib/permissions.ts");
  assert.match(permissions, /isOrganizerFieldOperationsEventStatus/);
}

function assertStatusTransitions() {
  assert.equal(
    isMutableOrganizerStatusTransition(
      OrganizerStatus.active,
      OrganizerStatus.suspended,
    ),
    true,
  );
  assert.equal(
    isMutableOrganizerStatusTransition(
      OrganizerStatus.suspended,
      OrganizerStatus.active,
    ),
    true,
  );
  assert.equal(
    isMutableOrganizerStatusTransition(
      OrganizerStatus.pending,
      OrganizerStatus.active,
    ),
    false,
  );
  assert.equal(
    isMutableOrganizerStatusTransition(
      OrganizerStatus.active,
      OrganizerStatus.archived,
    ),
    false,
  );
  assert.equal(
    isMutableGymStatusTransition(GymStatus.active, GymStatus.suspended),
    true,
  );
  assert.equal(
    isMutableGymStatusTransition(GymStatus.suspended, GymStatus.archived),
    false,
  );
}

function assertAdminUiLabels() {
  const adminUi = read("src/lib/ui/admin-ui.ts");
  assert.match(adminUi, /active: "정상"/);
  assert.match(adminUi, /suspended: "일시정지"/);
  assert.match(adminUi, /archived: "보관"/);
}

function main() {
  assertSchemaAuditActions();
  assertOrganizerPortalAccessModule();
  assertOrganizerLayoutGate();
  assertGymLayoutReuse();
  assertAdminStatusActions();
  assertEventOptionB();
  assertStatusTransitions();
  assertAdminUiLabels();
  console.log("verify:admin-organization-status: OK");
}

main();
