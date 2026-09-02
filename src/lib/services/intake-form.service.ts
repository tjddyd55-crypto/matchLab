import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { AuditAction, IntakeFormSubmissionStatus } from "@/lib/enums";
import type { IntakeFormFieldType, IntakeFormStatus } from "@/generated/prisma";
import {
  resolveIntakeFormOwnerScopeForGym,
  resolveIntakeFormOwnerScopeForOrganizer,
  type IntakeFormOwnerScope,
} from "@/lib/intake-form/access";
import {
  canSubmitIntakeForm,
  resolveIntakeFormAvailability,
} from "@/lib/intake-form/availability";
import {
  isDestructiveIntakeFieldTypeChange,
  normalizeIntakeFormFields,
  parseIntakeFormAnswerValue,
  validateIntakeFormAnswers,
  validateIntakeFormFieldDefinitions,
  type IntakeFormFieldDefinition,
} from "@/lib/intake-form/fields";
import { generateIntakeFormPublicToken } from "@/lib/intake-form/token";
import { prisma } from "@/lib/prisma";
import { auditRepository } from "@/lib/repositories/audit.repository";
import {
  intakeFormRepository,
  mapIntakeFormFieldsFromDb,
  type IntakeFormFieldRow,
} from "@/lib/repositories/intake-form.repository";
import { parseSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";
import { createSeoulDateTime } from "@/lib/gym-schedule/seoul-schedule";
import type { IntakeFormUpsertInput } from "@/lib/validators/intake-form.validator";

function parseOptionalDateTime(
  dateStr?: string | null,
  endOfDay?: boolean,
): Date | null {
  if (!dateStr?.trim()) return null;
  const key = dateStr.trim();
  if (!parseSeoulDateOnlyString(key)) return null;
  return createSeoulDateTime(key, endOfDay ? "23:59" : "00:00");
}

function toFieldRows(fields: IntakeFormFieldDefinition[]): IntakeFormFieldRow[] {
  return normalizeIntakeFormFields(fields).map((f) => ({
    stableKey: f.stableKey,
    label: f.label,
    type: f.type,
    placeholder: f.placeholder ?? null,
    helpText: f.helpText ?? null,
    required: f.required === true,
    options: f.options ?? [],
    displayOrder: f.displayOrder ?? 0,
  }));
}

function mapUpsertFields(
  raw: IntakeFormUpsertInput["fields"],
): IntakeFormFieldDefinition[] {
  return (raw ?? []).map((f) => ({
    stableKey: f.stableKey,
    label: f.label,
    type: f.type as IntakeFormFieldType,
    required: f.required,
    placeholder: f.placeholder ?? undefined,
    helpText: f.helpText ?? undefined,
    options: f.options,
    displayOrder: f.displayOrder,
  }));
}

async function requireFormForScope(
  scope: IntakeFormOwnerScope,
  formId: string,
) {
  const form = await intakeFormRepository.findByIdForOwner(formId, {
    ownerType: scope.ownerType,
    organizerId: scope.organizerId,
    gymId: scope.gymId,
  });
  if (!form) {
    throw new AppError("NOT_FOUND", "신청 폼을 찾을 수 없습니다.");
  }
  return form;
}

export const intakeFormService = {
  async listForOrganizer(actor: ActorContext) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    return intakeFormRepository.listByOwner({
      ownerType: "organizer",
      organizerId: scope.organizerId,
    });
  },

  async listForGym(actor: ActorContext) {
    const scope = await resolveIntakeFormOwnerScopeForGym(actor);
    return intakeFormRepository.listByOwner({
      ownerType: "gym",
      gymId: scope.gymId,
    });
  },

  async getForOrganizer(actor: ActorContext, formId: string) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    const form = await requireFormForScope(scope, formId);
    const activeCount = await intakeFormRepository.countActiveSubmissions(
      form.id,
    );
    return {
      form,
      fields: mapIntakeFormFieldsFromDb(form.fields),
      activeSubmissionCount: activeCount,
    };
  },

  async getForGym(actor: ActorContext, formId: string) {
    const scope = await resolveIntakeFormOwnerScopeForGym(actor);
    const form = await requireFormForScope(scope, formId);
    const activeCount = await intakeFormRepository.countActiveSubmissions(
      form.id,
    );
    return {
      form,
      fields: mapIntakeFormFieldsFromDb(form.fields),
      activeSubmissionCount: activeCount,
    };
  },

  async createForOrganizer(
    actor: ActorContext,
    input: IntakeFormUpsertInput,
    duplicateFromId?: string | null,
  ) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    return this.createWithScope(actor, scope, input, duplicateFromId);
  },

  async createForGym(
    actor: ActorContext,
    input: IntakeFormUpsertInput,
    duplicateFromId?: string | null,
  ) {
    const scope = await resolveIntakeFormOwnerScopeForGym(actor);
    return this.createWithScope(actor, scope, input, duplicateFromId);
  },

  async createWithScope(
    actor: ActorContext,
    scope: IntakeFormOwnerScope,
    input: IntakeFormUpsertInput,
    duplicateFromId?: string | null,
  ) {
    let fields = mapUpsertFields(input.fields);
    if (duplicateFromId) {
      const source = await intakeFormRepository.findByIdForOwner(
        duplicateFromId,
        {
          ownerType: scope.ownerType,
          organizerId: scope.organizerId,
          gymId: scope.gymId,
        },
      );
      if (!source) {
        throw new AppError("NOT_FOUND", "복제할 신청 폼을 찾을 수 없습니다.");
      }
      fields = mapIntakeFormFieldsFromDb(source.fields).map((f) => ({
        stableKey: f.stableKey,
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder ?? undefined,
        helpText: f.helpText ?? undefined,
        options: f.options,
        displayOrder: f.displayOrder,
      }));
      if (!input.title.trim()) {
        input.title = `${source.title} (복제)`;
      }
      if (!input.description?.trim() && source.description) {
        input.description = source.description;
      }
      if (input.completionMessage == null && source.completionMessage) {
        input.completionMessage = source.completionMessage;
      }
      if (input.maxSubmissions == null && source.maxSubmissions != null) {
        input.maxSubmissions = source.maxSubmissions;
      }
    }

    const normalized = normalizeIntakeFormFields(fields);
    const fieldError = validateIntakeFormFieldDefinitions(normalized);
    if (fieldError) {
      throw new AppError("VALIDATION_ERROR", fieldError);
    }

    const publicToken = generateIntakeFormPublicToken();
    const startsAt = parseOptionalDateTime(input.startsAt);
    const closesAt = parseOptionalDateTime(input.closesAt, true);

    const form = await intakeFormRepository.create(
      {
        ownerType: scope.ownerType,
        organizer:
          scope.organizerId
            ? { connect: { id: scope.organizerId } }
            : undefined,
        gym: scope.gymId ? { connect: { id: scope.gymId } } : undefined,
        title: input.title.trim(),
        description: input.description?.trim() ?? "",
        status: (input.status as IntakeFormStatus) ?? "DRAFT",
        publicToken,
        startsAt,
        closesAt,
        maxSubmissions: input.maxSubmissions,
        completionMessage: input.completionMessage?.trim() || null,
        createdByUser: actor.userId
          ? { connect: { id: actor.userId } }
          : undefined,
      },
      toFieldRows(normalized),
    );

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: duplicateFromId
        ? AuditAction.intake_form_duplicated
        : AuditAction.intake_form_created,
      targetType: "IntakeForm",
      targetId: form.id,
      afterData: {
        title: form.title,
        duplicateFromId: duplicateFromId ?? null,
      },
    });

    return form;
  },

  async updateForOrganizer(
    actor: ActorContext,
    formId: string,
    input: IntakeFormUpsertInput,
  ) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    return this.updateWithScope(actor, scope, formId, input);
  },

  async updateForGym(
    actor: ActorContext,
    formId: string,
    input: IntakeFormUpsertInput,
  ) {
    const scope = await resolveIntakeFormOwnerScopeForGym(actor);
    return this.updateWithScope(actor, scope, formId, input);
  },

  async updateWithScope(
    actor: ActorContext,
    scope: IntakeFormOwnerScope,
    formId: string,
    input: IntakeFormUpsertInput,
  ) {
    const existing = await requireFormForScope(scope, formId);
    const submissionCount = await prisma.intakeFormSubmission.count({
      where: { formId },
    });

    const normalized = normalizeIntakeFormFields(mapUpsertFields(input.fields));
    const fieldError = validateIntakeFormFieldDefinitions(normalized);
    if (fieldError) {
      throw new AppError("VALIDATION_ERROR", fieldError);
    }

    if (submissionCount > 0) {
      const oldByKey = new Map(
        existing.fields.map((f) => [f.stableKey, f.type]),
      );
      for (const field of normalized) {
        const oldType = oldByKey.get(field.stableKey);
        if (
          oldType &&
          isDestructiveIntakeFieldTypeChange(oldType, field.type)
        ) {
          throw new AppError(
            "VALIDATION_ERROR",
            `신청이 있는 상태에서는 "${field.label}" 항목의 입력 유형을 변경할 수 없습니다.`,
          );
        }
      }
    }

    const startsAt = parseOptionalDateTime(input.startsAt);
    const closesAt = parseOptionalDateTime(input.closesAt, true);

    await prisma.$transaction(async (tx) => {
      await intakeFormRepository.updateMeta(
        formId,
        {
          title: input.title.trim(),
          description: input.description?.trim() ?? "",
          status: input.status as IntakeFormStatus | undefined,
          startsAt,
          closesAt,
          maxSubmissions: input.maxSubmissions,
          completionMessage: input.completionMessage?.trim() || null,
        },
        tx,
      );
      await intakeFormRepository.replaceFields(
        formId,
        toFieldRows(normalized),
        tx,
      );
    });

    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.intake_form_updated,
      targetType: "IntakeForm",
      targetId: formId,
    });

    return intakeFormRepository.findById(formId);
  },

  async setStatusForOrganizer(
    actor: ActorContext,
    formId: string,
    status: IntakeFormStatus,
  ) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    return this.setStatusWithScope(actor, scope, formId, status);
  },

  async setStatusWithScope(
    actor: ActorContext,
    scope: IntakeFormOwnerScope,
    formId: string,
    status: IntakeFormStatus,
  ) {
    await requireFormForScope(scope, formId);
    await intakeFormRepository.updateMeta(formId, { status });
    const action =
      status === "OPEN"
        ? AuditAction.intake_form_reopened
        : status === "CLOSED"
          ? AuditAction.intake_form_closed
          : AuditAction.intake_form_updated;
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action,
      targetType: "IntakeForm",
      targetId: formId,
      afterData: { status },
    });
  },

  async archiveForOrganizer(actor: ActorContext, formId: string) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    await requireFormForScope(scope, formId);
    await intakeFormRepository.softDelete(formId);
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.intake_form_archived,
      targetType: "IntakeForm",
      targetId: formId,
    });
  },

  async listSubmissionsForOrganizer(actor: ActorContext, formId: string) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    await requireFormForScope(scope, formId);
    return intakeFormRepository.listSubmissions(formId);
  },

  async getSubmissionForOrganizer(
    actor: ActorContext,
    formId: string,
    submissionId: string,
  ) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    await requireFormForScope(scope, formId);
    const row = await intakeFormRepository.findSubmissionForForm(
      formId,
      submissionId,
    );
    if (!row) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }
    return row;
  },

  async updateSubmissionStatus(
    actor: ActorContext,
    formId: string,
    submissionId: string,
    status: IntakeFormSubmissionStatus,
    adminMemo?: string | null,
  ) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    await requireFormForScope(scope, formId);
    const row = await intakeFormRepository.findSubmissionForForm(
      formId,
      submissionId,
    );
    if (!row) {
      throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다.");
    }
    const updated = await intakeFormRepository.updateSubmissionStatus(
      submissionId,
      status,
      adminMemo,
    );
    await auditRepository.createAuditLog({
      actorUserId: actor.userId,
      action: AuditAction.intake_form_submission_status_changed,
      targetType: "IntakeFormSubmission",
      targetId: submissionId,
      afterData: { status, adminMemo: adminMemo ?? null },
    });
    return updated;
  },

  async listFormOptionsForOrganizer(actor: ActorContext) {
    const scope = await resolveIntakeFormOwnerScopeForOrganizer(actor);
    return intakeFormRepository.listFormOptionsForOwner({
      ownerType: "organizer",
      organizerId: scope.organizerId,
    });
  },
};

export const intakeFormPublicService = {
  async loadPublicForm(publicToken: string) {
    const form = await intakeFormRepository.findByPublicToken(publicToken);
    if (!form) return null;
    const activeCount = await intakeFormRepository.countActiveSubmissions(
      form.id,
    );
    const availability = resolveIntakeFormAvailability({
      status: form.status,
      startsAt: form.startsAt,
      closesAt: form.closesAt,
      maxSubmissions: form.maxSubmissions,
      activeSubmissionCount: activeCount,
    });
    return {
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        completionMessage: form.completionMessage,
        status: form.status,
      },
      fields: mapIntakeFormFieldsFromDb(form.fields).filter(
        (f) => f.type !== "static_info" || f.helpText || f.label,
      ),
      availability,
      canSubmit: canSubmitIntakeForm(availability),
    };
  },

  async submit(
    publicToken: string,
    answers: Record<string, unknown>,
    submitterUserId?: string | null,
  ) {
    const form = await intakeFormRepository.findByPublicToken(publicToken);
    if (!form) {
      throw new AppError("NOT_FOUND", "신청 폼을 찾을 수 없습니다.");
    }

    const fieldDefs: IntakeFormFieldDefinition[] = form.fields.map((f) => ({
      stableKey: f.stableKey,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder ?? undefined,
      helpText: f.helpText ?? undefined,
      options: Array.isArray(f.optionsJson)
        ? f.optionsJson.filter((x): x is string => typeof x === "string")
        : undefined,
    }));

    const validationError = validateIntakeFormAnswers(fieldDefs, answers);
    if (validationError) {
      throw new AppError("VALIDATION_ERROR", validationError);
    }

    const submission = await prisma.$transaction(async (tx) => {
      const activeCount = await intakeFormRepository.countActiveSubmissions(
        form.id,
        tx,
      );
      const availability = resolveIntakeFormAvailability({
        status: form.status,
        startsAt: form.startsAt,
        closesAt: form.closesAt,
        maxSubmissions: form.maxSubmissions,
        activeSubmissionCount: activeCount,
      });
      if (!canSubmitIntakeForm(availability)) {
        const msg =
          availability.kind === "open"
            ? "신청할 수 없습니다."
            : availability.message;
        throw new AppError("FORBIDDEN", msg);
      }

      const fieldIdByKey = new Map(form.fields.map((f) => [f.stableKey, f.id]));
      const answerRows = fieldDefs
        .filter((f) => f.type !== "static_info")
        .map((field) => {
          const parsed = parseIntakeFormAnswerValue(
            field.type,
            answers[field.stableKey],
          );
          return {
            fieldId: fieldIdByKey.get(field.stableKey) ?? null,
            fieldLabelSnapshot: field.label,
            fieldTypeSnapshot: field.type as IntakeFormFieldType,
            valueJson: parsed as unknown as object,
          };
        });

      return intakeFormRepository.createSubmission(
        {
          formId: form.id,
          submitterUserId,
          answers: answerRows,
        },
        tx,
      );
    });

    return {
      submissionId: submission.id,
      completionMessage:
        form.completionMessage?.trim() || "신청이 완료되었습니다.",
    };
  },
};
