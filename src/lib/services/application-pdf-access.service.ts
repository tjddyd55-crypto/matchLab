import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import { AppError } from "@/lib/errors/app-error";
import {
  requireGymOwner,
  requireOrganizerForEvent,
  requireRole,
} from "@/lib/permissions";
import { applicationDocumentRepository } from "@/lib/repositories/application-document.repository";
import { applicationFormTemplateRepository } from "@/lib/repositories/application-form-template.repository";
import {
  createApplicationDocumentPdfDownloadSignedUrl,
  createApplicationFormPdfDownloadSignedUrl,
} from "@/lib/services/upload.service";

function assertTemplatePdfPath(path: string): void {
  if (!path.startsWith("templates/") || path.includes("..")) {
    throw new AppError("FORBIDDEN", "유효하지 않은 PDF 경로입니다.");
  }
}

function assertGeneratedPdfPath(path: string): void {
  if (!path.startsWith("application-documents/") || path.includes("..")) {
    throw new AppError("FORBIDDEN", "유효하지 않은 PDF 경로입니다.");
  }
}

export const applicationPdfAccessService = {
  async getTemplatePdfViewUrl(
    actor: ActorContext,
    templateId: string,
  ): Promise<{ viewUrl: string; expiresIn: number; fileName: string }> {
    requireRole(actor, ["admin", "organizer"]);
    const template = await applicationFormTemplateRepository.findById(templateId);
    if (!template) {
      throw new AppError("NOT_FOUND", "신청서 템플릿을 찾을 수 없습니다.");
    }
    if (actor.role === "organizer") {
      if (
        template.organizerId &&
        template.organizerId !== actor.organizerId
      ) {
        throw new AppError("FORBIDDEN", "이 템플릿에 접근할 수 없습니다.");
      }
    }
    assertTemplatePdfPath(template.originalPdfPath);
    const { signedUrl, expiresIn } = await createApplicationFormPdfDownloadSignedUrl(
      { path: template.originalPdfPath },
    );
    return {
      viewUrl: signedUrl,
      expiresIn,
      fileName: template.originalPdfFileName,
    };
  },

  async getDocumentGeneratedPdfViewUrl(
    actor: ActorContext,
    eventId: string,
    documentId: string,
  ): Promise<{ viewUrl: string; expiresIn: number; fileName: string }> {
    const doc = await applicationDocumentRepository.findById(documentId);
    if (!doc || doc.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "신청서 문서를 찾을 수 없습니다.");
    }
    if (!doc.generatedPdfPath) {
      throw new AppError("NOT_FOUND", "생성된 PDF가 아직 없습니다.");
    }
    assertGeneratedPdfPath(doc.generatedPdfPath);

    if (actor.role === "admin") {
      // ok
    } else if (actor.role === "organizer") {
      await requireOrganizerForEvent(actor, eventId);
    } else if (actor.role === "gym") {
      if (!actor.gymId || doc.gymId !== actor.gymId) {
        throw new AppError("FORBIDDEN", "접근 권한이 없습니다.");
      }
      await requireGymOwner(actor, doc.gymId);
    } else {
      throw new AppError("FORBIDDEN", "접근 권한이 없습니다.");
    }

    const { signedUrl, expiresIn } =
      await createApplicationDocumentPdfDownloadSignedUrl({
        path: doc.generatedPdfPath,
      });

    const fileName = `${doc.fighter.name}-application.pdf`;
    return { viewUrl: signedUrl, expiresIn, fileName };
  },

  async getDocumentOriginalTemplatePdfViewUrl(
    actor: ActorContext,
    eventId: string,
    documentId: string,
  ): Promise<{ viewUrl: string; expiresIn: number; fileName: string }> {
    const doc = await applicationDocumentRepository.findById(documentId);
    if (!doc || doc.eventId !== eventId) {
      throw new AppError("NOT_FOUND", "신청서 문서를 찾을 수 없습니다.");
    }
    assertTemplatePdfPath(doc.originalTemplatePdfPath);

    if (actor.role === "admin") {
      // ok
    } else if (actor.role === "organizer") {
      await requireOrganizerForEvent(actor, eventId);
    } else if (actor.role === "gym") {
      if (!actor.gymId || doc.gymId !== actor.gymId) {
        throw new AppError("FORBIDDEN", "접근 권한이 없습니다.");
      }
      await requireGymOwner(actor, doc.gymId);
    } else {
      throw new AppError("FORBIDDEN", "접근 권한이 없습니다.");
    }

    const { signedUrl, expiresIn } = await createApplicationFormPdfDownloadSignedUrl(
      { path: doc.originalTemplatePdfPath },
    );
    return {
      viewUrl: signedUrl,
      expiresIn,
      fileName: doc.template.originalPdfFileName,
    };
  },
};
