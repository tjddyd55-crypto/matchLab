import "server-only";

import type { Prisma } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import {
  applicationFormTemplateRepository,
  type ApplicationFormTemplateListRow,
} from "@/lib/repositories/application-form-template.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import type {
  CreateApplicationFormTemplateInput,
  LinkEventApplicationFormTemplateInput,
  UpdateApplicationFormTemplateInput,
} from "@/lib/validators/application-form-template.validator";

function assertAdmin(actor: ActorContext): void {
  requireRole(actor, ["admin"]);
}

function assertTemplateAccess(
  actor: ActorContext,
  templateOrganizerId: string | null,
): void {
  if (actor.role === "admin") return;
  if (!actor.organizerId) {
    throw new AppError("FORBIDDEN", "주최자 프로필이 없습니다.");
  }
  if (templateOrganizerId && templateOrganizerId !== actor.organizerId) {
    throw new AppError("FORBIDDEN", "이 템플릿에 접근할 수 없습니다.");
  }
  if (!templateOrganizerId) {
    throw new AppError("FORBIDDEN", "전체 공용 템플릿은 관리자만 수정할 수 있습니다.");
  }
}

export type ApplicationFormTemplateListItemVM = {
  id: string;
  title: string;
  description: string | null;
  originalPdfFileName: string;
  isActive: boolean;
  organizerId: string | null;
  organizerName: string | null;
  fieldCount: number;
  updatedAt: string;
};

export type ApplicationFormTemplateDetailVM = ApplicationFormTemplateListItemVM & {
  originalPdfPath: string;
  fieldsJson: unknown;
  repeatGroupsJson: unknown;
  manualFieldsJson: unknown | null;
  consentMappingJson: unknown | null;
};

function toListItem(row: ApplicationFormTemplateListRow): ApplicationFormTemplateListItemVM {
  const fields = Array.isArray(row.fieldsJson) ? row.fieldsJson : [];
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    originalPdfFileName: row.originalPdfFileName,
    isActive: row.isActive,
    organizerId: row.organizerId,
    organizerName: row.organizer?.name ?? null,
    fieldCount: fields.length,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const applicationFormTemplateService = {
  async listTemplates(
    actor: ActorContext,
    options?: { organizerId?: string; activeOnly?: boolean },
  ): Promise<ApplicationFormTemplateListItemVM[]> {
    requireRole(actor, ["admin", "organizer"]);
    if (actor.role === "organizer") {
      if (!actor.organizerId) {
        throw new AppError("FORBIDDEN", "주최자 프로필이 없습니다.");
      }
      const rows = await applicationFormTemplateRepository.list({
        organizerId: actor.organizerId,
        activeOnly: options?.activeOnly ?? true,
      });
      return rows.map(toListItem);
    }
    const rows = await applicationFormTemplateRepository.list({
      organizerId: options?.organizerId,
      activeOnly: options?.activeOnly,
    });
    return rows.map(toListItem);
  },

  async getTemplateDetail(
    actor: ActorContext,
    templateId: string,
  ): Promise<ApplicationFormTemplateDetailVM> {
    requireRole(actor, ["admin", "organizer"]);
    const row = await applicationFormTemplateRepository.findById(templateId);
    if (!row) {
      throw new AppError("NOT_FOUND", "신청서 템플릿을 찾을 수 없습니다.");
    }
    assertTemplateAccess(actor, row.organizerId);
    return {
      ...toListItem({ ...row, organizer: null }),
      originalPdfPath: row.originalPdfPath,
      fieldsJson: row.fieldsJson,
      repeatGroupsJson: row.repeatGroupsJson,
      manualFieldsJson: row.manualFieldsJson,
      consentMappingJson: row.consentMappingJson,
    };
  },

  async createTemplate(
    actor: ActorContext,
    input: CreateApplicationFormTemplateInput,
  ): Promise<{ templateId: string }> {
    assertAdmin(actor);
    const created = await applicationFormTemplateRepository.create({
      organizerId: input.organizerId ?? null,
      title: input.title,
      description: input.description ?? null,
      originalPdfPath: input.originalPdfPath,
      originalPdfFileName: input.originalPdfFileName,
      fieldsJson: input.fieldsJson,
      repeatGroupsJson: input.repeatGroupsJson,
      manualFieldsJson: input.manualFieldsJson ?? null,
      consentMappingJson: input.consentMappingJson ?? null,
      isActive: input.isActive ?? true,
      createdByAdminUserId: actor.userId,
    });
    return { templateId: created.id };
  },

  async updateTemplate(
    actor: ActorContext,
    input: UpdateApplicationFormTemplateInput,
  ): Promise<void> {
    assertAdmin(actor);
    const existing = await applicationFormTemplateRepository.findById(
      input.templateId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", "신청서 템플릿을 찾을 수 없습니다.");
    }
    await applicationFormTemplateRepository.update(input.templateId, {
      organizerId: input.organizerId,
      title: input.title,
      description: input.description,
      originalPdfPath: input.originalPdfPath,
      originalPdfFileName: input.originalPdfFileName,
      fieldsJson: input.fieldsJson,
      repeatGroupsJson: input.repeatGroupsJson,
      manualFieldsJson: input.manualFieldsJson as Prisma.InputJsonValue | null | undefined,
      consentMappingJson: input.consentMappingJson as Prisma.InputJsonValue | null | undefined,
      isActive: input.isActive,
    });
  },

  async linkTemplateToEvent(
    actor: ActorContext,
    input: LinkEventApplicationFormTemplateInput,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, input.eventId);
    if (input.applicationFormTemplateId) {
      const template = await applicationFormTemplateRepository.findById(
        input.applicationFormTemplateId,
      );
      if (!template || !template.isActive) {
        throw new AppError("NOT_FOUND", "활성 신청서 템플릿을 찾을 수 없습니다.");
      }
      const organizerId = await eventRepository.findEventOrganizerId(
        input.eventId,
      );
      if (!organizerId) {
        throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
      }
      if (
        template.organizerId &&
        template.organizerId !== organizerId &&
        actor.role !== "admin"
      ) {
        throw new AppError("FORBIDDEN", "이 주최자에 연결된 템플릿만 선택할 수 있습니다.");
      }
    }
    await eventRepository.updateEvent(input.eventId, {
      applicationFormTemplate: input.applicationFormTemplateId
        ? { connect: { id: input.applicationFormTemplateId } }
        : { disconnect: true },
    });
  },

  async listSelectableForEvent(
    actor: ActorContext,
    eventId: string,
  ): Promise<ApplicationFormTemplateListItemVM[]> {
    await requireOrganizerForEvent(actor, eventId);
    const organizerId = await eventRepository.findEventOrganizerId(eventId);
    if (!organizerId) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    const rows = await applicationFormTemplateRepository.list({
      activeOnly: true,
    });
    const filtered = rows.filter(
      (r) => !r.organizerId || r.organizerId === organizerId,
    );
    return filtered.map(toListItem);
  },
};
