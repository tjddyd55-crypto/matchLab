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
import { APPLICATION_FORM_COORDINATE_SYSTEM } from "@/lib/constants/application-form-pdf-upload";
import { ApplicationFormTemplatePdfUpload } from "@/components/domain/application-form-templates/ApplicationFormTemplatePdfUpload";
import { PdfCoordinateEditor } from "@/components/domain/application-form-templates/pdf-editor/PdfCoordinateEditor";
import {
  fieldsToJsonValue,
  parseApplicationPdfFields,
  type ApplicationPdfField,
} from "@/lib/pdf-editor/application-pdf-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function stringifyJson(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback), null, 2);
  } catch {
    return fallback;
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
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!originalPdfPath || pdfBytes) return;
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
  }, [initial?.id, originalPdfFileName, originalPdfPath, pdfBytes]);

  function openAdvancedJson() {
    setFieldsJsonText(stringifyJson(fieldsToJsonValue(fields), "[]"));
    setAdvancedJsonOpen(true);
  }

  function applyJsonToFields() {
    setJsonError(null);
    try {
      const parsed = JSON.parse(fieldsJsonText || "[]") as unknown;
      const next = parseApplicationPdfFields(parsed);
      setFields(next);
      setAdvancedJsonOpen(false);
    } catch {
      setJsonError("fieldsJson JSON 형식이 올바르지 않습니다.");
    }
  }

  function loadExampleFieldsJson() {
    try {
      const parsed = JSON.parse(EXAMPLE_APPLICATION_FORM_FIELDS_JSON) as unknown;
      setFields(parseApplicationPdfFields(parsed));
      setRepeatGroupsJson(EXAMPLE_APPLICATION_FORM_REPEAT_GROUPS_JSON);
    } catch {
      setJsonError("예시 JSON을 불러오지 못했습니다.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!originalPdfPath.trim() || !originalPdfFileName.trim()) {
      setError("공식 신청서 PDF 파일을 업로드해 주세요.");
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
    if (organizerId.trim()) fd.set("organizerId", organizerId.trim());
    fd.set("originalPdfPath", originalPdfPath);
    fd.set("originalPdfFileName", originalPdfFileName);
    fd.set("fieldsJson", fieldsJsonForSave);
    fd.set("repeatGroupsJson", repeatGroupsJson);
    fd.set("manualFieldsJson", manualFieldsJson);
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

    if (mode === "create" && "templateId" in res.data) {
      router.push(
        `/admin/application-form-templates/${res.data.templateId}`,
      );
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

      <ApplicationFormTemplatePdfUpload
        templateId={initial?.id}
        fileName={originalPdfFileName || null}
        onUploaded={(path, name, bytes) => {
          setOriginalPdfPath(path);
          setOriginalPdfFileName(name);
          setPdfBytes(bytes);
          if (fields.length === 0) {
            loadExampleFieldsJson();
          }
        }}
      />

      {originalPdfPath ? (
        <section className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">PDF 좌표 편집</h2>
              <p className="text-muted-foreground text-xs">
                좌표계: {APPLICATION_FORM_COORDINATE_SYSTEM} · pt · 보험 플랫폼
                PdfCoordinateEditor UX 참고
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadExampleFieldsJson}>
              테스트용 fieldsJson 불러오기
            </Button>
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

      <details
        open={advancedJsonOpen}
        onToggle={(e) => {
          const open = e.currentTarget.open;
          if (open) {
            setFieldsJsonText(stringifyJson(fieldsToJsonValue(fields), "[]"));
          }
          setAdvancedJsonOpen(open);
        }}
        className="rounded-lg border p-4"
      >
        <summary
          className="cursor-pointer text-sm font-medium"
          onClick={() => {
            if (!advancedJsonOpen) openAdvancedJson();
          }}
        >
          고급 JSON 편집 (fieldsJson)
        </summary>
        <div className="mt-3 space-y-2">
          {jsonError ? (
            <p className="text-destructive text-xs" role="alert">
              {jsonError}
            </p>
          ) : null}
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
      </details>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">repeatGroupsJson</h2>
        <p className="text-muted-foreground text-xs">
          반복 선수 목록은 추후 시각 편집 지원 예정입니다. 필요 시 JSON으로
          입력하세요.
        </p>
        <textarea
          value={repeatGroupsJson}
          onChange={(e) => setRepeatGroupsJson(e.target.value)}
          rows={4}
          spellCheck={false}
          className={fieldClass}
        />
      </section>

      <JsonArea
        label="manualFieldsJson (선택)"
        value={manualFieldsJson}
        onChange={setManualFieldsJson}
      />
      <JsonArea
        label="consentMappingJson (선택)"
        value={consentMappingJson}
        onChange={setConsentMappingJson}
      />

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        spellCheck={false}
        className={fieldClass}
      />
    </label>
  );
}

/** @deprecated ApplicationFormTemplateEditor 사용 */
export const ApplicationFormTemplateForm = ApplicationFormTemplateEditor;
