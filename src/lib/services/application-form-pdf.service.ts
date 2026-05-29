import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import type { Prisma } from "@/generated/prisma";
import { applicationDocumentRepository } from "@/lib/repositories/application-document.repository";
import {
  applicationFormRenderService,
  type FormRenderContext,
  type PdfFieldDefinition,
} from "@/lib/services/application-form-render.service";
import {
  buildApplicationDocumentGeneratedPdfPath,
  downloadPrivateObjectBytes,
  getApplicationDocumentsBucketName,
  getApplicationFormsBucketName,
  getConsentSignaturesBucketName,
  uploadPrivateObjectBytes,
} from "@/lib/services/upload.service";

/** fieldsJson y는 페이지 좌상단(top-left) 기준 → pdf-lib bottom-left로 변환 */
function toPdfLibRect(
  pageHeight: number,
  field: Pick<PdfFieldDefinition, "x" | "y" | "width" | "height">,
): { x: number; y: number; width: number; height: number } {
  return {
    x: field.x,
    y: pageHeight - field.y - field.height,
    width: field.width,
    height: field.height,
  };
}

function resolveSignaturePath(
  source: string,
  doc: NonNullable<Awaited<ReturnType<typeof applicationDocumentRepository.findById>>>,
): string | null {
  if (source === "athlete.signatureImage") {
    return doc.athleteConsent?.signatureImagePath ?? null;
  }
  if (source === "guardian.signatureImage") {
    return doc.guardianConsent?.signatureImagePath ?? null;
  }
  return null;
}

function formatSignedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ko-KR");
  } catch {
    return iso;
  }
}

export const applicationFormPdfService = {
  mapDocumentSnapshotToPdfFields(
    fields: PdfFieldDefinition[],
    previewValues: Record<string, string>,
  ): Map<string, string> {
    return new Map(
      fields
        .filter((f) => f.type !== "signature")
        .map((f) => [f.id, previewValues[f.id] ?? ""]),
    );
  },

  async generateApplicationDocumentPdf(
    documentId: string,
  ): Promise<string | null> {
    const doc = await applicationDocumentRepository.findById(documentId);
    if (!doc || doc.status !== "completed") {
      return null;
    }
    if (
      doc.template.templateType === "built_in_form" ||
      !doc.originalTemplatePdfPath
    ) {
      return null;
    }

    const snapshot = doc.documentSnapshotJson as Record<string, unknown> | null;
    const previewValues =
      snapshot &&
      typeof snapshot === "object" &&
      "previewValues" in snapshot &&
      typeof snapshot.previewValues === "object" &&
      snapshot.previewValues
        ? (snapshot.previewValues as Record<string, string>)
        : null;

    if (!previewValues || !doc.batchId) {
      return null;
    }

    const fields = applicationFormRenderService.parseFieldsJson(
      doc.template.fieldsJson,
    );

    let templateBytes: Uint8Array;
    try {
      templateBytes = await downloadPrivateObjectBytes(
        getApplicationFormsBucketName(),
        doc.originalTemplatePdfPath,
      );
    } catch (e) {
      console.error("applicationFormPdfService: template download failed", e);
      return null;
    }

    try {
      const pdfDoc = await PDFDocument.load(templateBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 10;

      for (const field of fields) {
        const pageIndex = Math.max(0, field.page - 1);
        const pages = pdfDoc.getPages();
        if (pageIndex >= pages.length) continue;
        const page = pages[pageIndex]!;
        const { height: pageHeight } = page.getSize();
        const rect = toPdfLibRect(pageHeight, field);

        if (field.type === "signature") {
          const sigPath = resolveSignaturePath(field.source, doc);
          if (!sigPath) continue;
          let imageBytes: Uint8Array;
          try {
            imageBytes = await downloadPrivateObjectBytes(
              getConsentSignaturesBucketName(),
              sigPath,
            );
          } catch {
            continue;
          }
          const image = await pdfDoc.embedPng(imageBytes);
          page.drawImage(image, {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          });
          continue;
        }

        let text = previewValues[field.id] ?? "";
        if (field.type === "date" && field.source.endsWith(".signedAt")) {
          text = formatSignedAt(text || null);
        }
        if (!text) continue;

        page.drawText(text, {
          x: rect.x,
          y: rect.y + Math.max(2, rect.height - fontSize - 2),
          size: Math.min(fontSize, rect.height - 2),
          font,
          color: rgb(0, 0, 0),
          maxWidth: rect.width,
        });
      }

      const outputBytes = await pdfDoc.save();
      const generatedPath = buildApplicationDocumentGeneratedPdfPath({
        eventId: doc.eventId,
        batchId: doc.batchId,
        documentId: doc.id,
      });

      await uploadPrivateObjectBytes(
        getApplicationDocumentsBucketName(),
        generatedPath,
        outputBytes,
        "application/pdf",
      );

      await applicationDocumentRepository.update(documentId, {
        generatedPdfPath: generatedPath,
      });

      return generatedPath;
    } catch (e) {
      console.error("applicationFormPdfService: PDF generation failed", e);
      return null;
    }
  },
};

export function buildCompletedDocumentSnapshot(
  fields: PdfFieldDefinition[],
  ctx: FormRenderContext,
  meta: {
    templateId: string;
    templateTitle: string;
    originalPdfPath: string;
    originalPdfFileName: string;
    capturedAt: string;
  },
): Prisma.InputJsonValue {
  return applicationFormRenderService.buildDocumentSnapshot(fields, ctx, meta);
}
