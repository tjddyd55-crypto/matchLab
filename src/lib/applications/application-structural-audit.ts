import type { Prisma } from "@/generated/prisma";
import { AuditAction } from "@/generated/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";

export type ApplicationStructuralAuditSource =
  | "ORGANIZER_APPLICATION_EDIT"
  | "ORGANIZER_APPLICATION_CREATE";

type StructuralAuditValues = {
  divisionId: string | null;
  gender: string | null;
};

export async function appendApplicationStructuralAudit(
  tx: Prisma.TransactionClient,
  params: {
    actorUserId: string | null;
    eventId: string;
    applicationId: string;
    fighterId: string;
    source: ApplicationStructuralAuditSource;
    before: StructuralAuditValues;
    after: StructuralAuditValues;
  },
): Promise<void> {
  const fieldChanges: Array<{
    field: "divisionId" | "gender";
    previousValue: string | null;
    newValue: string | null;
  }> = [];

  if (params.before.divisionId !== params.after.divisionId) {
    fieldChanges.push({
      field: "divisionId",
      previousValue: params.before.divisionId,
      newValue: params.after.divisionId,
    });
  }
  if (params.before.gender !== params.after.gender) {
    fieldChanges.push({
      field: "gender",
      previousValue: params.before.gender,
      newValue: params.after.gender,
    });
  }
  if (fieldChanges.length === 0) return;

  await auditRepository.createAuditLog(
    {
      actorUserId: params.actorUserId,
      action: AuditAction.event_application_structural_changed,
      targetType: "EventApplication",
      targetId: params.applicationId,
      beforeData: {
        eventId: params.eventId,
        fighterId: params.fighterId,
        source: params.source,
        changes: fieldChanges.map((c) => ({
          field: c.field,
          value: c.previousValue,
        })),
      },
      afterData: {
        eventId: params.eventId,
        fighterId: params.fighterId,
        source: params.source,
        changes: fieldChanges.map((c) => ({
          field: c.field,
          value: c.newValue,
        })),
      },
    },
    tx,
  );
}
