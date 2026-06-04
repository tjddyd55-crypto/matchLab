import "server-only";

import type { Prisma } from "@/generated/prisma";
import type { FormRenderContext } from "@/lib/services/application-form-render.service";
import type {
  BuiltInFormFieldDefinition,
  BuiltInFormSnapshot,
} from "@/lib/built-in-form/built-in-form-types";

function resolveBuiltInSource(
  source: string,
  ctx: FormRenderContext,
  manualValues: Record<string, unknown>,
): string {
  if (source === "manual") {
    const v = manualValues[source];
    return v == null ? "" : String(v);
  }
  if (source.startsWith("manual.")) {
    const key = source.slice("manual.".length);
    const v = manualValues[key] ?? manualValues[source];
    return v == null ? "" : String(v);
  }
  if (source === "athlete.consent") {
    return ctx.athlete.consentStatus === "completed" ? "동의 완료" : "대기";
  }
  if (source === "guardian.consent") {
    return ctx.guardian.consentStatus === "completed" ? "동의 완료" : "대기";
  }
  if (source === "athlete.signatureImage") {
    return ctx.athlete.consentStatus === "completed" ? "서명 완료" : "대기";
  }
  if (source === "guardian.signatureImage") {
    return ctx.guardian.consentStatus === "completed" ? "서명 완료" : "대기";
  }

  const parts = source.split(".");
  if (parts.length < 2) return "";
  const [root, key] = parts as [keyof FormRenderContext, string];
  const bucket = ctx[root];
  if (!bucket || typeof bucket !== "object") return "";
  const value = (bucket as Record<string, unknown>)[key];
  if (value == null) return "";
  if (key === "birthDate" && typeof value === "string") {
    try {
      return new Date(value).toLocaleDateString("ko-KR");
    } catch {
      return value;
    }
  }
  return String(value);
}

export const builtInFormRenderService = {
  parseFieldsJson(raw: Prisma.JsonValue): BuiltInFormFieldDefinition[] {
    if (!Array.isArray(raw)) return [];
    const out: BuiltInFormFieldDefinition[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const label = typeof o.label === "string" ? o.label : "";
      const source = typeof o.source === "string" ? o.source : "";
      const typeRaw = typeof o.type === "string" ? o.type : "text";
      if (!id || !label) continue;
      const type =
        typeRaw === "textarea" ||
        typeRaw === "number" ||
        typeRaw === "date" ||
        typeRaw === "select" ||
        typeRaw === "checkbox" ||
        typeRaw === "radio" ||
        typeRaw === "file" ||
        typeRaw === "signature" ||
        typeRaw === "consentText"
          ? typeRaw
          : "text";
      out.push({
        id,
        label,
        type,
        source: source || "manual",
        required:
          o.required === "if_minor"
            ? "if_minor"
            : o.required === true || o.required === "true",
        editable: o.editable !== false,
        displayOrder:
          typeof o.displayOrder === "number" ? o.displayOrder : out.length,
        placeholder:
          typeof o.placeholder === "string" ? o.placeholder : undefined,
        options: Array.isArray(o.options)
          ? o.options.filter((x): x is string => typeof x === "string")
          : undefined,
        consentText:
          typeof o.consentText === "string" ? o.consentText : undefined,
      });
    }
    return out.sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );
  },

  buildDisplayValues(
    fields: BuiltInFormFieldDefinition[],
    ctx: FormRenderContext,
    manualValues: Record<string, unknown>,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === "signature" || field.type === "consentText") {
        out[field.id] = resolveBuiltInSource(field.source, ctx, manualValues);
        continue;
      }
      const manualKey =
        field.source === "manual"
          ? field.id
          : field.source.startsWith("manual.")
            ? field.source.slice("manual.".length)
            : null;
      if (manualKey && manualValues[manualKey] != null) {
        out[field.id] = String(manualValues[manualKey]);
      } else {
        out[field.id] = resolveBuiltInSource(field.source, ctx, manualValues);
      }
    }
    return out;
  },

  buildDocumentSnapshot(
    fields: BuiltInFormFieldDefinition[],
    ctx: FormRenderContext,
    manualValues: Record<string, unknown>,
    meta: {
      templateId: string;
      templateTitle: string;
      capturedAt: string;
      requiresGuardian: boolean;
      athleteSigned: boolean;
      guardianSigned: boolean;
    },
  ): BuiltInFormSnapshot {
    const values = this.buildDisplayValues(fields, ctx, manualValues);
    const fieldLabels: Record<string, string> = {};
    for (const f of fields) {
      fieldLabels[f.id] = f.label;
    }

    return {
      mode: "built_in_form",
      templateId: meta.templateId,
      templateTitle: meta.templateTitle,
      capturedAt: meta.capturedAt,
      values,
      fieldLabels,
      signatures: {
        athlete: meta.athleteSigned
          ? "completed"
          : "pending",
        guardian: meta.requiresGuardian
          ? meta.guardianSigned
            ? "completed"
            : "pending"
          : "not_required",
      },
    };
  },

  /** 인쇄·상세 화면용 label → value */
  toLabelValueRows(snapshot: BuiltInFormSnapshot): Array<{ label: string; value: string }> {
    return Object.entries(snapshot.values).map(([id, value]) => ({
      label: snapshot.fieldLabels[id] ?? id,
      value,
    }));
  },
};
