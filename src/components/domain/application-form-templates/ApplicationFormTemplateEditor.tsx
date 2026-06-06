"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationFormTemplateDetailVM } from "@/lib/services/application-form-template.service";
import {
  createApplicationFormTemplateAction,
  updateApplicationFormTemplateAction,
} from "@/features/application-form-templates/actions";
import {
  getApplicationFormTemplatePdfViewUrlAction,
  getApplicationFormTemplatePdfViewUrlByPathAction,
} from "@/features/application-form-templates/pdf-upload-actions";
import {
  EXAMPLE_APPLICATION_FORM_FIELDS_JSON,
  EXAMPLE_APPLICATION_FORM_REPEAT_GROUPS_JSON,
} from "@/lib/constants/application-form-template-examples";
import { ApplicationFormTemplatePdfUpload } from "@/components/domain/application-form-templates/ApplicationFormTemplatePdfUpload";
import { CustomFormBuilder } from "@/components/domain/application-form-templates/CustomFormBuilder";
import { PdfCoordinateEditor } from "@/components/domain/application-form-templates/pdf-editor/PdfCoordinateEditor";
import {
  fieldsToJsonValue,
  parseApplicationPdfFields,
  type ApplicationPdfField,
} from "@/lib/pdf-editor/application-pdf-field";
import {
  inferTemplateEditorFormMode,
  parseManualFieldsConfig,
  serializeManualFieldsConfig,
  validateCustomFormFieldDefinitions,
  type ApplicationFormMode,
  type CustomFormFieldDefinition,
} from "@/lib/application-form/custom-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FORM_MODE_OPTIONS: {
  value: ApplicationFormMode;
  title: string;
  description: string;
}[] = [
  {
    value: "pdf",
    title: "PDF 신청서",
    description: "공식 PDF 업로드 후 좌표로 필드를 배치합니다.",
  },
  {
    value: "custom",
    title: "자체 폼 신청서",
    description: "PDF 없이 화면에서 항목을 구성합니다.",
  },
  {
    value: "none",
    title: "신청서 없음",
    description: "PDF·자체 폼 항목 없이 템플릿 껍데기만 저장합니다.",
  },
];

function stringifyJson(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback), null, 2);
  } catch {
    return fallback;
  }
}

function validateFields(fields: ApplicationPdfField[]): string | null {
  const ids = new Set<string>();
  for (const f of fields) {
    if (!f.id.trim()) return "필드 id가 비어 있습니다.";
    if (ids.has(f.id)) return `필드 id "${f.id}"가 중복되었습니다.`;
    ids.add(f.id);
    if (!Number.isFinite(f.page) || f.page < 1) {
      return `"${f.label}" 페이지 번호가 올바르지 않습니다.`;
    }
    for (const key of ["x", "y", "width", "height"] as const) {
      if (!Number.isFinite(f[key])) {
        return `"${f.label}" ${key} 값이 올바르지 않습니다.`;
      }
    }
  }
  return null;
}

function parseOptionalJson(raw: string, label: string): unknown | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    throw new Error(`${label} JSON 형식이 올바르지 않습니다.`);
  }
}

async function fetchPdfBytesFromViewUrl(viewUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(viewUrl);
  if (!res.ok) throw new Error("PDF fetch failed");
  return res.arrayBuffer();
}

export function ApplicationFormTemplateEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ApplicationFormTemplateDetailVM;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [customFormError, setCustomFormError] = useState<string | null>(null);

  const initialManual = parseManualFieldsConfig(initial?.manualFieldsJson);
  const [templateFormMode, setTemplateFormMode] = useState<ApplicationFormMode>(
    () =>
      initial
        ? inferTemplateEditorFormMode({
            fieldsJson: initial.fieldsJson,
            manualFieldsJson: initial.manualFieldsJson,
            originalPdfPath: initial.originalPdfPath,
          })
        : "custom",
  );

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [organizerId, setOrganizerId] = useState(initial?.organizerId ?? "");
  const [originalPdfPath, setOriginalPdfPath] = useState(
    initial?.originalPdfPath ?? "",
  );
  const [originalPdfFileName, setOriginalPdfFileName] = useState(
    initial?.originalPdfFileName ?? "",
  );
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [fields, setFields] = useState<ApplicationPdfField[]>(() =>
    parseApplicationPdfFields(initial?.fieldsJson),
  );
  const [fieldsJsonText, setFieldsJsonText] = useState(() =>
    stringifyJson(initial?.fieldsJson, "[]"),
  );
  const [repeatGroupsJson, setRepeatGroupsJson] = useState(
    stringifyJson(initial?.repeatGroupsJson, "[]"),
  );
  const [customFields, setCustomFields] = useState<CustomFormFieldDefinition[]>(
    () => initialManual.fields,
  );
  const [manualFieldsJson, setManualFieldsJson] = useState(
    initial?.manualFieldsJson
      ? stringifyJson(initial.manualFieldsJson, "{}")
      : "",
  );
  const [consentMappingJson, setConsentMappingJson] = useState(
    initial?.consentMappingJson
      ? stringifyJson(initial.consentMappingJson, "{}")
      : "",
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const fieldsJsonForSave = useMemo(
    () => JSON.stringify(fieldsToJsonValue(fields)),
    [fields],
  );

  const manualFieldsForSave = useMemo(() => {
    if (templateFormMode !== "custom") return "";
    return JSON.stringify(
      serializeManualFieldsConfig({
        formMode: "custom",
        fields: customFields,
      }),
    );
  }, [customFields, templateFormMode]);

  useEffect(() => {
    if (templateFormMode !== "pdf" || !originalPdfPath || pdfBytes) return;
    let cancelled = false;
    void (async () => {
      try {
        let viewUrl: string;
        if (initial?.id) {
          const fd = new FormData();
          fd.set("templateId", initial.id);
          const res = await getApplicationFormTemplatePdfViewUrlAction(fd);
          if (!res.ok || cancelled) return;
          viewUrl = res.data.viewUrl;
        } else {
          const fd = new FormData();
          fd.set("path", originalPdfPath);
          fd.set("fileName", originalPdfFileName);
          const res = await getApplicationFormTemplatePdfViewUrlByPathAction(fd);
          if (!res.ok || cancelled) return;
          viewUrl = res.data.viewUrl;
        }
        const bytes = await fetchPdfBytesFromViewUrl(viewUrl);
        if (!cancelled) setPdfBytes(bytes);
      } catch {
        /* 편집 화면 — PDF 로드 실패는 업로드로 복구 가능 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial?.id, originalPdfFileName, originalPdfPath, pdfBytes, templateFormMode]);

  function handleFormModeChange(next: ApplicationFormMode) {
    if (next === templateFormMode) return;
    const confirmed = window.confirm(
      "신청서 방식을 변경해도 기존 편집 데이터는 화면에 유지됩니다. 저장 시 선택한 방식의 데이터만 반영됩니다. 계속할까요?",
    );
    if (!confirmed) return;
    setTemplateFormMode(next);
    setError(null);
    setCustomFormError(null);
  }

  function syncAdvancedJsonFromFields() {
    setFieldsJsonText(stringifyJson(fieldsToJsonValue(fields), "[]"));
    setJsonError(null);
  }

  function applyJsonToFields() {
    setJsonError(null);
    try {
      const parsed = JSON.parse(fieldsJsonText || "[]") as unknown;
      const next = parseApplicationPdfFields(parsed);
      const validationError = validateFields(next);
      if (validationError) {
        setJsonError(validationError);
        return;
      }
      setFields(next);
    } catch {
      setJsonError("fieldsJson JSON 형식이 올바르지 않습니다.");
    }
  }

  function loadExampleFieldsJson() {
    setJsonError(null);
    try {
      const parsed = JSON.parse(EXAMPLE_APPLICATION_FORM_FIELDS_JSON) as unknown;
      const next = parseApplicationPdfFields(parsed);
      setFields(next);
      setFieldsJsonText(EXAMPLE_APPLICATION_FORM_FIELDS_JSON);
      setRepeatGroupsJson(EXAMPLE_APPLICATION_FORM_REPEAT_GROUPS_JSON);
    } catch {
      setJsonError("예시 JSON을 불러오지 못했습니다.");
    }
  }

  function applyManualJsonToBuilder() {
    setCustomFormError(null);
    try {
      const parsed = parseOptionalJson(manualFieldsJson, "manualFieldsJson");
      const config = parseManualFieldsConfig(parsed);
      const validation = validateCustomFormFieldDefinitions(config.fields);
      if (validation) {
        setCustomFormError(validation);
        return;
      }
      setCustomFields(config.fields);
      setTemplateFormMode("custom");
    } catch (err) {
      setCustomFormError(
        err instanceof Error ? err.message : "JSON 형식을 확인해 주세요.",
      );
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfo(null);
    setCustomFormError(null);

    if (!title.trim()) {
      setError("템플릿명을 입력해 주세요.");
      return;
    }

    if (templateFormMode === "pdf") {
      if (!originalPdfPath.trim() || !originalPdfFileName.trim()) {
        setError("PDF 신청서는 공식 PDF 파일 업로드를 해 주세요.");
        return;
      }
      const fieldValidation = validateFields(fields);
      if (fieldValidation) {
        setError(fieldValidation);
        return;
      }
    }

    if (templateFormMode === "custom") {
      const customValidation = validateCustomFormFieldDefinitions(customFields);
      if (customValidation) {
        setCustomFormError(customValidation);
        setError(customValidation);
        return;
      }
    }

    try {
      parseJsonArray(repeatGroupsJson, "repeatGroupsJson");
      if (templateFormMode !== "custom") {
        parseOptionalJson(manualFieldsJson, "manualFieldsJson");
      }
      parseOptionalJson(consentMappingJson, "consentMappingJson");
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON 형식을 확인해 주세요.");
      return;
    }

    setPending(true);
    setError(null);

    const fd = new FormData();
    if (mode === "edit" && initial) {
      fd.set("templateId", initial.id);
    }
    fd.set("title", title);
    fd.set("description", description);
    fd.set("templateFormMode", templateFormMode);
    if (organizerId.trim()) fd.set("organizerId", organizerId.trim());

    if (templateFormMode === "pdf") {
      fd.set("originalPdfPath", originalPdfPath);
      fd.set("originalPdfFileName", originalPdfFileName);
      fd.set("fieldsJson", fieldsJsonForSave);
      fd.set("repeatGroupsJson", repeatGroupsJson || "[]");
      fd.set("manualFieldsJson", "");
    } else if (templateFormMode === "custom") {
      fd.set("originalPdfPath", "");
      fd.set("originalPdfFileName", "");
      fd.set("fieldsJson", "[]");
      fd.set("repeatGroupsJson", repeatGroupsJson || "[]");
      fd.set("manualFieldsJson", manualFieldsForSave);
    } else {
      fd.set("originalPdfPath", "");
      fd.set("originalPdfFileName", "");
      fd.set("fieldsJson", "[]");
      fd.set("repeatGroupsJson", "[]");
      fd.set("manualFieldsJson", "");
    }

    fd.set("consentMappingJson", consentMappingJson);
    if (isActive) fd.set("isActive", "on");

    const res =
      mode === "create"
        ? await createApplicationFormTemplateAction(fd)
        : await updateApplicationFormTemplateAction(fd);

    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }

    if (templateFormMode === "pdf" && fields.length === 0) {
      setInfo(
        "좌표가 아직 없습니다. 이후 템플릿 상세에서 좌표를 추가할 수 있습니다.",
      );
    }

    if (mode === "create" && "templateId" in res.data) {
      router.push(`/admin/application-form-templates/${res.data.templateId}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-8">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="text-muted-foreground text-sm" role="status">
          {info}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <FormField label="템플릿명" value={title} onChange={setTitle} required />
        <FormField
          label="주최자 ID (비우면 전체 공용)"
          value={organizerId}
          onChange={setOrganizerId}
        />
        <label className="block space-y-1 text-sm md:col-span-2">
          <span className="font-medium">설명 (선택)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={fieldClass}
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">신청서 방식</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {FORM_MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "cursor-pointer rounded-xl border p-4 transition-colors",
                templateFormMode === opt.value
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/40",
              )}
            >
              <input
                type="radio"
                name="templateFormMode"
                className="sr-only"
                checked={templateFormMode === opt.value}
                onChange={() => handleFormModeChange(opt.value)}
              />
              <p className="text-sm font-medium">{opt.title}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {opt.description}
              </p>
            </label>
          ))}
        </div>
      </section>

      {templateFormMode === "pdf" ? (
        <>
          <ApplicationFormTemplatePdfUpload
            templateId={initial?.id}
            fileName={originalPdfFileName || null}
            onUploaded={(path, name, bytes) => {
              setOriginalPdfPath(path);
              setOriginalPdfFileName(name);
              setPdfBytes(bytes);
            }}
          />

          {originalPdfPath ? (
            <section className="space-y-3 rounded-xl border p-4">
              <div>
                <h2 className="text-sm font-semibold">PDF 좌표 편집</h2>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  PDF 위에서 직접 좌표 영역을 추가하세요.
                  <br />
                  테스트용 좌표는 필요할 때만 고급 설정에서 불러올 수 있습니다.
                </p>
              </div>
              {pdfBytes ? (
                <PdfCoordinateEditor
                  pdfBytes={pdfBytes}
                  fields={fields}
                  onChange={setFields}
                />
              ) : (
                <p className="text-muted-foreground text-sm">PDF 로딩 중…</p>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      {templateFormMode === "custom" ? (
        <CustomFormBuilder
          fields={customFields}
          onChange={setCustomFields}
          validationError={customFormError}
        />
      ) : null}

      {templateFormMode === "none" ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          이 템플릿은 신청서 항목 없이 저장됩니다. 대회에 연결해도 체육관 신청서
          작성 단계는 표시되지 않습니다.
        </p>
      ) : null}

      <details
        className="rounded-lg border p-4"
        onToggle={(e) => {
          if (e.currentTarget.open && templateFormMode === "pdf") {
            syncAdvancedJsonFromFields();
          }
        }}
      >
        <summary className="cursor-pointer text-sm font-medium">고급 설정 (JSON)</summary>
        <div className="mt-4 space-y-6">
          {jsonError ? (
            <p className="text-destructive text-xs" role="alert">
              {jsonError}
            </p>
          ) : null}

          {templateFormMode === "pdf" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">fieldsJson 직접 편집</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={loadExampleFieldsJson}
                >
                  예시 좌표 불러오기
                </Button>
              </div>
              <textarea
                value={fieldsJsonText}
                onChange={(e) => setFieldsJsonText(e.target.value)}
                rows={12}
                spellCheck={false}
                className={fieldClass}
              />
              <Button type="button" variant="secondary" size="sm" onClick={applyJsonToFields}>
                JSON을 화면에 반영
              </Button>
            </div>
          ) : null}

          {templateFormMode === "pdf" ? (
            <JsonArea
              label="repeatGroupsJson"
              value={repeatGroupsJson}
              onChange={setRepeatGroupsJson}
              rows={4}
            />
          ) : null}

          {templateFormMode === "custom" ? (
            <div className="grid gap-2">
              <JsonArea
                label="manualFieldsJson (자체 폼 — 디버그용)"
                value={
                  manualFieldsJson.trim() ? manualFieldsJson : manualFieldsForSave
                }
                onChange={setManualFieldsJson}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={applyManualJsonToBuilder}
              >
                JSON을 화면에 반영
              </Button>
            </div>
          ) : null}

          <JsonArea
            label="consentMappingJson (선택)"
            value={consentMappingJson}
            onChange={setConsentMappingJson}
          />
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        활성 템플릿
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : mode === "create" ? "템플릿 생성" : "변경 저장"}
      </Button>
    </form>
  );
}

function parseJsonArray(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw || "[]") as unknown;
  } catch {
    throw new Error(`${label} JSON 형식이 올바르지 않습니다.`);
  }
}

const fieldClass = cn(
  "border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-sm font-mono",
);

function FormField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

function JsonArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={fieldClass}
      />
    </label>
  );
}

/** @deprecated ApplicationFormTemplateEditor 사용 */
export const ApplicationFormTemplateForm = ApplicationFormTemplateEditor;
