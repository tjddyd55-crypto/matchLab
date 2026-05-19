import "server-only";

import type { Prisma } from "@/generated/prisma";

export type PdfFieldDefinition = {
  id: string;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "text" | "checkbox" | "signature" | "date";
  source: string;
};

export type FormRenderContext = {
  event: {
    title: string;
    date: string;
    location: string | null;
  };
  gym: {
    name: string;
    ownerName?: string | null;
    phoneMasked?: string | null;
  };
  fighter: {
    name: string;
    birthDate: string;
    gender: string;
    weight: number | null;
    recordSummary: string;
  };
  application: {
    division: string;
    weightClass: string | null;
  };
  athlete: {
    consentStatus: string;
    signedAt: string | null;
  };
  guardian: {
    consentStatus: string;
    signedAt: string | null;
  };
  manual: Record<string, unknown>;
};

function resolveSource(
  source: string,
  ctx: FormRenderContext,
): string | boolean | null {
  if (source === "manual") return null;
  if (
    source === "athlete.signatureImage" ||
    source === "guardian.signatureImage"
  ) {
    const bucket =
      source === "athlete.signatureImage" ? ctx.athlete : ctx.guardian;
    return bucket.consentStatus === "completed" ? "✓" : "";
  }
  const parts = source.split(".");
  if (parts.length < 2) return null;
  const [root, key] = parts as [keyof FormRenderContext, string];
  const bucket = ctx[root];
  if (!bucket || typeof bucket !== "object") return null;
  const value = (bucket as Record<string, unknown>)[key];
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  return String(value);
}

export const applicationFormRenderService = {
  parseFieldsJson(raw: Prisma.JsonValue): PdfFieldDefinition[] {
    if (!Array.isArray(raw)) return [];
    const out: PdfFieldDefinition[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const label = typeof o.label === "string" ? o.label : "";
      const source = typeof o.source === "string" ? o.source : "";
      if (!id || !label || !source) continue;
      out.push({
        id,
        label,
        page: typeof o.page === "number" ? o.page : 1,
        x: typeof o.x === "number" ? o.x : 0,
        y: typeof o.y === "number" ? o.y : 0,
        width: typeof o.width === "number" ? o.width : 100,
        height: typeof o.height === "number" ? o.height : 20,
        type:
          o.type === "checkbox" ||
          o.type === "signature" ||
          o.type === "date"
            ? o.type
            : "text",
        source,
      });
    }
    return out;
  },

  buildPreviewValues(
    fields: PdfFieldDefinition[],
    ctx: FormRenderContext,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const field of fields) {
      const resolved = resolveSource(field.source, ctx);
      if (field.source.startsWith("manual.")) {
        const manualKey = field.source.slice("manual.".length);
        const manualVal = ctx.manual[manualKey];
        out[field.id] =
          manualVal == null ? "" : String(manualVal);
        continue;
      }
      if (typeof resolved === "boolean") {
        out[field.id] = resolved ? "✓" : "";
      } else {
        out[field.id] = resolved ?? "";
      }
    }
    return out;
  },

  buildDocumentSnapshot(
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
    return {
      version: "v1",
      ...meta,
      previewValues: this.buildPreviewValues(fields, ctx),
      fields: fields.map((f) => ({
        id: f.id,
        label: f.label,
        source: f.source,
      })),
      // PDF overlay: completed 시 application-form-pdf.service에서 generatedPdfPath 저장
    };
  },
};
