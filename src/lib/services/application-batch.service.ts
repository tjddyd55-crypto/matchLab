import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import { EventStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { requireGymOwner, requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { applicationBatchRepository } from "@/lib/repositories/application-batch.repository";
import { applicationDocumentRepository } from "@/lib/repositories/application-document.repository";
import { eventRepository } from "@/lib/repositories/event.repository";

function assertRegistrationWindow(event: {
  registrationStartDate: Date;
  registrationEndDate: Date;
  status: EventStatus;
}): void {
  if (event.status !== EventStatus.open) {
    throw new AppError("FORBIDDEN", "신청이 열려 있지 않은 대회입니다.");
  }
  const now = new Date();
  if (now < event.registrationStartDate || now > event.registrationEndDate) {
    throw new AppError("FORBIDDEN", "신청 기간이 아닙니다.");
  }
}

async function assertGym(actor: ActorContext): Promise<string> {
  requireRole(actor, ["gym", "admin"]);
  const gymId = actor.gymId;
  if (!gymId) {
    throw new AppError("FORBIDDEN", "체육관 계정이 필요합니다.");
  }
  await requireGymOwner(actor, gymId);
  return gymId;
}

export type GymApplicationWorkspaceVM = {
  event: {
    id: string;
    title: string;
    registrationStartDate: string;
    registrationEndDate: string;
  };
  template: {
    id: string;
    title: string;
    originalPdfFileName: string;
    originalPdfPath: string;
    fieldCount: number;
  } | null;
  batch: {
    id: string;
    status: string;
    documentCount: number;
  } | null;
  policyNotice: string[];
};

export const applicationBatchService = {
  async getGymApplicationWorkspace(
    actor: ActorContext,
    eventId: string,
  ): Promise<GymApplicationWorkspaceVM> {
    const gymId = await assertGym(actor);
    const event =
      await eventRepository.findEventWithDivisionsForApplication(eventId);
    if (!event) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    assertRegistrationWindow(event);

    let batch = await applicationBatchRepository.findDraftForGymEvent(
      eventId,
      gymId,
    );

    if (!event.applicationFormTemplate) {
      return {
        event: {
          id: event.id,
          title: event.title,
          registrationStartDate: event.registrationStartDate.toISOString(),
          registrationEndDate: event.registrationEndDate.toISOString(),
        },
        template: null,
        batch: null,
        policyNotice: [
          "이 대회에는 공식 신청서 템플릿이 연결되지 않았습니다.",
          "주최자에게 문의해 주세요.",
        ],
      };
    }

    if (!batch) {
      const created = await applicationBatchRepository.create({
        eventId,
        gymId,
        applicationFormTemplateId: event.applicationFormTemplate.id,
      });
      batch = await applicationBatchRepository.findById(created.id);
    }

    const template = event.applicationFormTemplate;
    const fields = Array.isArray(template.fieldsJson) ? template.fieldsJson : [];

    return {
      event: {
        id: event.id,
        title: event.title,
        registrationStartDate: event.registrationStartDate.toISOString(),
        registrationEndDate: event.registrationEndDate.toISOString(),
      },
      template: {
        id: template.id,
        title: template.title,
        originalPdfFileName: template.originalPdfFileName,
        originalPdfPath: template.originalPdfPath,
        fieldCount: fields.length,
      },
      batch: batch
        ? {
            id: batch.id,
            status: batch.status,
            documentCount: batch.documents.length,
          }
        : null,
      policyNotice: [
        "주최측 공식 신청서 양식 그대로 작성됩니다.",
        "선수별로 작성 완료된 신청서 파일이 생성됩니다.",
        "완료된 신청서는 체육관을 통해 주최측에 제출됩니다.",
        "미성년자 또는 학생 선수는 보호자 동의가 필요합니다.",
        "선수 등록 단계의 동의/서명과 별개로, 대회 신청 시 공식 신청서에 서명합니다.",
      ],
    };
  },

  async submitBatch(
    actor: ActorContext,
    batchId: string,
  ): Promise<{ documentNo: string }> {
    const gymId = await assertGym(actor);
    const batch = await applicationBatchRepository.findById(batchId);
    if (!batch || batch.gymId !== gymId) {
      throw new AppError("NOT_FOUND", "신청 묶음을 찾을 수 없습니다.");
    }
    if (batch.status !== "draft") {
      throw new AppError("CONFLICT", "이미 제출된 묶음입니다.");
    }
    if (batch.documents.length === 0) {
      throw new AppError("VALIDATION_ERROR", "제출할 선수 신청서가 없습니다.");
    }

    const incomplete = batch.documents.filter((d) => d.status !== "completed");
    if (incomplete.length > 0) {
      throw new AppError(
        "FORBIDDEN",
        `서명·동의가 완료되지 않은 선수가 ${incomplete.length}명 있습니다. 완료 후 제출해 주세요.`,
      );
    }

    const payment = await eventRepository.findEventPaymentSettingFull(
      batch.eventId,
    );
    const feePer = payment?.feeAmount ?? 0;
    const totalFee = feePer * batch.documents.length;
    const documentNo = `BATCH-${batch.eventId.slice(-6).toUpperCase()}-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      await applicationBatchRepository.updateStatus(
        batchId,
        {
          status: "submitted",
          documentNo,
          submittedByUserId: actor.userId,
          submittedAt: new Date(),
          totalFighterCount: batch.documents.length,
          organizerFeePerFighter: feePer,
          organizerTotalFee: totalFee,
        },
        tx,
      );

      for (const doc of batch.documents) {
        await applicationDocumentRepository.update(
          doc.id,
          { status: "submitted", submittedAt: new Date() },
          tx,
        );
      }
    });

    return { documentNo };
  },

  async listBatchesForOrganizer(actor: ActorContext, eventId: string) {
    await requireOrganizerForEvent(actor, eventId);
    const rows = await applicationBatchRepository.listForEvent(eventId);
    return rows.map((r) => ({
      id: r.id,
      documentNo: r.documentNo,
      gymName: r.gym.name,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      status: r.status,
      fighterCount: r._count.documents,
      templateTitle: r.template.title,
      organizerTotalFee: r.organizerTotalFee,
    }));
  },

  async getBatchDetailForOrganizer(
    actor: ActorContext,
    eventId: string,
    batchId: string,
  ) {
    await requireOrganizerForEvent(actor, eventId);
    const batch = await applicationBatchRepository.findById(batchId);
    if (!batch || batch.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "신청 묶음을 찾을 수 없습니다.");
    }
    return batch;
  },
};
