import "server-only";

import { randomBytes } from "node:crypto";

import type { ApplicationDocumentStatus } from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor-context";
import { requiresGuardianConsentFromFighterProfile } from "@/lib/consent-policy";
import { AppError } from "@/lib/errors/app-error";
import { ConsentStatus, FighterConsentStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { maskPhoneLoosely } from "@/lib/privacy-display";
import { requireGymOwner, requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { applicationBatchRepository } from "@/lib/repositories/application-batch.repository";
import { applicationDocumentRepository } from "@/lib/repositories/application-document.repository";
import { eventRepository } from "@/lib/repositories/event.repository";
import { fighterConsentRepository } from "@/lib/repositories/fighter-consent.repository";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import {
  applicationFormRenderService,
  type FormRenderContext,
} from "@/lib/services/application-form-render.service";
import {
  CONSENT_DOCUMENT_TITLE,
  CONSENT_DOCUMENT_VERSION,
} from "@/lib/services/consent.service";
import type { CreateApplicationDocumentInput } from "@/lib/validators/application-document.validator";

export const APPLICATION_DOCUMENT_ATHLETE_TITLE =
  "대회 참가 신청서 — 선수 본인 확인";

function signToken(): string {
  return randomBytes(24).toString("hex");
}

function formatRecordSummary(row: {
  recordWin: number;
  recordLoss: number;
  recordDraw: number;
}): string {
  return `${row.recordWin}승 ${row.recordLoss}패 ${row.recordDraw}무`;
}

function formatDivisionLabel(d: {
  sportType: string | null;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  skillLevel: string | null;
}): string {
  return [
    d.sportType,
    d.ruleType,
    d.weightClass ?? d.ageGroup,
    d.gender,
    d.skillLevel,
  ]
    .filter((x): x is string => Boolean(x?.trim()))
    .join(" · ");
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

export type ApplicationDocumentRowVM = {
  id: string;
  fighterId: string;
  fighterName: string;
  fighterCode: string;
  divisionLabel: string;
  status: ApplicationDocumentStatus;
  athleteSignUrl: string | null;
  guardianConsentUrl: string | null;
  requiresGuardian: boolean;
  athleteSigned: boolean;
  guardianSigned: boolean;
  previewValues: Record<string, string>;
};

export const applicationDocumentService = {
  async createDocumentForFighter(
    actor: ActorContext,
    input: CreateApplicationDocumentInput,
  ): Promise<{ documentId: string }> {
    const gymId = await assertGym(actor);
    const batch = await applicationBatchRepository.findById(input.batchId);
    if (!batch || batch.gymId !== gymId) {
      throw new AppError("NOT_FOUND", "신청 묶음을 찾을 수 없습니다.");
    }
    if (batch.status !== "draft") {
      throw new AppError("CONFLICT", "제출된 묶음에는 문서를 추가할 수 없습니다.");
    }

    const fighter = await fighterRepository.findFighterForGymApplication(
      input.fighterId,
      gymId,
    );
    if (!fighter) {
      throw new AppError("FORBIDDEN", "소속 선수만 선택할 수 있습니다.");
    }

    const existing = await applicationDocumentRepository.findByFighterBatch(
      input.batchId,
      input.fighterId,
    );
    if (existing) {
      throw new AppError("CONFLICT", "이미 해당 선수의 신청서 문서가 있습니다.");
    }

    const template = batch.template;
    const originalTemplatePdfPath = template.originalPdfPath;
    if (!originalTemplatePdfPath) {
      throw new AppError(
        "CONFLICT",
        "PDF 템플릿이 아닌 신청서에는 공식 PDF 문서를 생성할 수 없습니다.",
      );
    }
    const fields = applicationFormRenderService.parseFieldsJson(
      template.fieldsJson,
    );
    const manualValues = input.manualValues ?? {};

    const belongs = await eventRepository.findDivisionBelongsToEvent(
      input.divisionId,
      batch.eventId,
    );
    if (!belongs) {
      throw new AppError("NOT_FOUND", "유효하지 않은 부문입니다.");
    }

    const divisionRow = await prisma.eventDivision.findUnique({
      where: { id: input.divisionId },
    });
    const divisionLabel = divisionRow ? formatDivisionLabel(divisionRow) : "—";

    const renderCtx: FormRenderContext = {
      event: {
        title: batch.event.title,
        date: batch.event.eventDate.toISOString(),
        location: null,
      },
      gym: { name: batch.gym.name },
      fighter: {
        name: fighter.name,
        birthDate: fighter.birthDate.toISOString(),
        gender: fighter.gender,
        weight: fighter.weight,
        recordSummary: formatRecordSummary(fighter),
      },
      application: {
        division: divisionLabel,
        weightClass: divisionRow?.weightClass ?? null,
      },
      athlete: { consentStatus: "pending", signedAt: null },
      guardian: { consentStatus: "pending", signedAt: null },
      manual: manualValues,
    };

    const requiresGuardian = requiresGuardianConsentFromFighterProfile({
      birthDate: fighter.birthDate,
      schoolName: fighter.schoolName,
      grade: fighter.grade,
      guardianName: fighter.guardianName,
      guardianPhone: fighter.guardianPhone,
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

    return prisma.$transaction(async (tx) => {
      const doc = await applicationDocumentRepository.create(
        {
          eventId: batch.eventId,
          gymId,
          fighterId: fighter.id,
          batchId: batch.id,
          templateId: template.id,
          originalTemplatePdfPath,
          formValuesJson: JSON.parse(
            JSON.stringify({
              divisionId: input.divisionId,
              divisionLabel,
              manual: manualValues,
              preview: applicationFormRenderService.buildPreviewValues(
                fields,
                renderCtx,
              ),
            }),
          ) as Parameters<
            typeof applicationDocumentRepository.create
          >[0]["formValuesJson"],
          status: "waiting_athlete_signature",
        },
        tx,
      );

      const athleteConsent = await fighterConsentRepository.create(
        {
          fighterId: fighter.id,
          eventId: batch.eventId,
          token: signToken(),
          consentType: "application_document_signature",
          signerName: fighter.name,
          signerPhoneMasked: maskPhoneLoosely(fighter.phone),
          documentTitle: APPLICATION_DOCUMENT_ATHLETE_TITLE,
        },
        tx,
      );

      await applicationDocumentRepository.update(
        doc.id,
        { athleteConsentId: athleteConsent.id },
        tx,
      );

      let guardianConsentId: string | null = null;
      if (requiresGuardian) {
        const guardianName =
          fighter.guardianName?.trim() || "(동의서 제출 시 확인)";
        const guardianPhone =
          fighter.guardianPhone?.trim() || "__PENDING__";
        const gc = await tx.guardianConsent.create({
          data: {
            fighterId: fighter.id,
            eventId: batch.eventId,
            guardianName,
            guardianPhone,
            documentTitle: `${CONSENT_DOCUMENT_TITLE} (대회 신청)`,
            documentVersion: CONSENT_DOCUMENT_VERSION,
            consentStatus: ConsentStatus.draft,
          },
          select: { id: true },
        });
        guardianConsentId = gc.id;
        await applicationDocumentRepository.update(
          doc.id,
          { guardianConsentId: gc.id },
          tx,
        );
      }

      void guardianConsentId;
      void baseUrl;

      return { documentId: doc.id };
    });
  },

  async listDocumentsForGymBatch(
    actor: ActorContext,
    batchId: string,
  ): Promise<ApplicationDocumentRowVM[]> {
    const gymId = await assertGym(actor);
    const batch = await applicationBatchRepository.findById(batchId);
    if (!batch || batch.gymId !== gymId) {
      throw new AppError("NOT_FOUND", "신청 묶음을 찾을 수 없습니다.");
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

    return batch.documents.map((doc) => {
      const formValues = doc.formValuesJson as Record<string, unknown>;
      const preview =
        formValues &&
        typeof formValues === "object" &&
        "preview" in formValues &&
        typeof formValues.preview === "object" &&
        formValues.preview
          ? (formValues.preview as Record<string, string>)
          : {};

      const requiresGuardian = Boolean(doc.guardianConsentId);
      const athleteSigned =
        doc.athleteConsent?.status === FighterConsentStatus.completed;
      const guardianSigned =
        doc.guardianConsent?.consentStatus === ConsentStatus.completed;

      return {
        id: doc.id,
        fighterId: doc.fighterId,
        fighterName: doc.fighter.name,
        fighterCode: doc.fighter.fighterCode,
        divisionLabel:
          typeof formValues?.divisionLabel === "string"
            ? formValues.divisionLabel
            : "—",
        status: doc.status,
        athleteSignUrl: doc.athleteConsent?.token
          ? `${baseUrl}/application-sign/${doc.athleteConsent.token}`
          : null,
        guardianConsentUrl: doc.guardianConsentId
          ? `${baseUrl}/guardian-consent/${doc.guardianConsentId}?scope=application`
          : null,
        requiresGuardian,
        athleteSigned,
        guardianSigned,
        previewValues: preview,
      };
    });
  },

  async getDocumentForOrganizer(
    actor: ActorContext,
    eventId: string,
    documentId: string,
  ) {
    await requireOrganizerForEvent(actor, eventId);
    const doc = await applicationDocumentRepository.findById(documentId);
    if (!doc || doc.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "신청서 문서를 찾을 수 없습니다.");
    }
    return doc;
  },

  async refreshDocumentStatusAfterSignature(
    documentId: string,
    tx?: Parameters<typeof applicationDocumentRepository.update>[2],
  ): Promise<void> {
    const doc = await applicationDocumentRepository.findById(documentId, tx);
    if (!doc) return;

    const athleteOk =
      doc.athleteConsent?.status === FighterConsentStatus.completed;
    const guardianOk =
      !doc.guardianConsentId ||
      doc.guardianConsent?.consentStatus === ConsentStatus.completed;

    let status: ApplicationDocumentStatus = doc.status;
    if (!athleteOk) {
      status = "waiting_athlete_signature";
    } else if (!guardianOk) {
      status = "waiting_guardian_signature";
    } else {
      status = "completed";
    }

    if (status === "completed" && !doc.documentSnapshotJson) {
      const fields = applicationFormRenderService.parseFieldsJson(
        doc.template.fieldsJson,
      );
      const formValues = doc.formValuesJson as Record<string, unknown>;
      const manual =
        formValues &&
        typeof formValues === "object" &&
        "manual" in formValues &&
        typeof formValues.manual === "object"
          ? (formValues.manual as Record<string, unknown>)
          : {};
      const divisionLabel =
        typeof formValues?.divisionLabel === "string"
          ? formValues.divisionLabel
          : "—";

      const renderCtx: FormRenderContext = {
        event: {
          title: doc.event.title,
          date: doc.event.eventDate.toISOString(),
          location: doc.event.location,
        },
        gym: { name: doc.gym.name },
        fighter: {
          name: doc.fighter.name,
          birthDate: doc.fighter.birthDate.toISOString(),
          gender: doc.fighter.gender,
          weight: doc.fighter.weight,
          recordSummary: formatRecordSummary(doc.fighter),
        },
        application: {
          division: divisionLabel,
          weightClass: null,
        },
        athlete: {
          consentStatus: athleteOk ? "completed" : "pending",
          signedAt: doc.athleteConsent?.signedAt?.toISOString() ?? null,
        },
        guardian: {
          consentStatus: guardianOk ? "completed" : "pending",
          signedAt: doc.guardianConsent?.signedAt?.toISOString() ?? null,
        },
        manual,
      };

      const snapshot = applicationFormRenderService.buildDocumentSnapshot(
        fields,
        renderCtx,
        {
          templateId: doc.templateId,
          templateTitle: doc.template.title,
          originalPdfPath: doc.originalTemplatePdfPath,
          originalPdfFileName: doc.template.originalPdfFileName ?? "—",
          capturedAt: new Date().toISOString(),
        },
      );

      await applicationDocumentRepository.update(
        documentId,
        {
          status,
          documentSnapshotJson: snapshot,
          completedAt: new Date(),
        },
        tx,
      );

      if (!tx) {
        void applicationDocumentService.finalizeCompletedDocument(documentId);
      }
      return;
    }

    await applicationDocumentRepository.update(documentId, { status }, tx);

    if (!tx && status === "completed") {
      void applicationDocumentService.finalizeCompletedDocument(documentId);
    }
  },

  async finalizeCompletedDocument(documentId: string): Promise<void> {
    const { applicationFormPdfService } = await import(
      "@/lib/services/application-form-pdf.service"
    );
    await applicationFormPdfService.generateApplicationDocumentPdf(documentId);
  },
};
