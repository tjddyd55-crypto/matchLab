"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationFormTemplateDetailVM } from "@/lib/services/application-form-template.service";
import {
  createApplicationFormTemplateAction,
  updateApplicationFormTemplateAction,
} from "@/features/application-form-templates/actions";
import {
  EXAMPLE_APPLICATION_FORM_FIELDS_JSON,
  EXAMPLE_APPLICATION_FORM_REPEAT_GROUPS_JSON,
  PLACEHOLDER_PDF_FILE_NAME,
  PLACEHOLDER_PDF_PATH,
} from "@/lib/constants/application-form-template-examples";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function stringifyJson(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback), null, 2);
  } catch {
    return fallback;
  }
}

export function ApplicationFormTemplateForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ApplicationFormTemplateDetailVM;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [organizerId, setOrganizerId] = useState(initial?.organizerId ?? "");
  const [originalPdfPath, setOriginalPdfPath] = useState(
    initial?.originalPdfPath ?? (mode === "create" ? PLACEHOLDER_PDF_PATH : ""),
  );
  const [originalPdfFileName, setOriginalPdfFileName] = useState(
    initial?.originalPdfFileName ??
      (mode === "create" ? PLACEHOLDER_PDF_FILE_NAME : ""),
  );
  const [fieldsJson, setFieldsJson] = useState(
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    fd.set("fieldsJson", fieldsJson);
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
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <FormField
        label="템플릿명"
        value={title}
        onChange={setTitle}
        required
      />
      <label className="block space-y-1 text-sm">
        <span className="font-medium">설명 (선택)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={fieldClass}
        />
      </label>
      <FormField
        label="주최자 ID (비우면 전체 공용)"
        value={organizerId}
        onChange={setOrganizerId}
      />
      <FormField
        label="원본 PDF Storage 경로"
        value={originalPdfPath}
        onChange={setOriginalPdfPath}
        required
      />
      <FormField
        label="원본 PDF 파일명"
        value={originalPdfFileName}
        onChange={setOriginalPdfFileName}
        required
      />

      <JsonArea
        label="fieldsJson"
        hint="PDF 필드 좌표·source 정의 JSON 배열"
        value={fieldsJson}
        onChange={setFieldsJson}
        onLoadExample={() => setFieldsJson(EXAMPLE_APPLICATION_FORM_FIELDS_JSON)}
      />
      <JsonArea
        label="repeatGroupsJson"
        hint="반복 행 그룹 JSON 배열"
        value={repeatGroupsJson}
        onChange={setRepeatGroupsJson}
        onLoadExample={() =>
          setRepeatGroupsJson(EXAMPLE_APPLICATION_FORM_REPEAT_GROUPS_JSON)
        }
      />
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
  hint,
  value,
  onChange,
  onLoadExample,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onLoadExample?: () => void;
}) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        {onLoadExample ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadExample}
          >
            예시 JSON 불러오기
          </Button>
        ) : null}
      </div>
      {hint ? <span className="text-muted-foreground block text-xs">{hint}</span> : null}
      <textarea
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        spellCheck={false}
        className={fieldClass}
      />
    </div>
  );
}
