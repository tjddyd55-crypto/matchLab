"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApplicationFormTemplateListItemVM } from "@/lib/services/application-form-template.service";
import { linkEventApplicationFormTemplateAction } from "@/features/application-form-templates/actions";
import {
  loadDefaultBuiltInFormAction,
  saveBuiltInFormFieldsAction,
  updateEventApplicationFormModeAction,
} from "@/features/built-in-form/actions";
import { BuiltInFormFieldsEditor } from "@/components/domain/applications/BuiltInFormFieldsEditor";
import { Button } from "@/components/ui/button";
import type { BuiltInFormFieldDefinition } from "@/lib/built-in-form/built-in-form-types";
import { ApplicationFormMode } from "@/lib/enums";

export function EventApplicationFormModeSection({
  eventId,
  applicationFormMode,
  linkedTemplateId,
  pdfTemplates,
  builtInTitle,
  builtInFieldsJson,
}: {
  eventId: string;
  applicationFormMode: ApplicationFormMode;
  linkedTemplateId: string | null;
  pdfTemplates: ApplicationFormTemplateListItemVM[];
  builtInTitle: string | null;
  builtInFieldsJson: unknown;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(applicationFormMode);
  const [selectedPdf, setSelectedPdf] = useState(
    applicationFormMode === ApplicationFormMode.official_pdf
      ? linkedTemplateId ?? ""
      : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedPdf = pdfTemplates.find((t) => t.id === linkedTemplateId) ?? null;
  const initialFields = Array.isArray(builtInFieldsJson)
    ? (builtInFieldsJson as BuiltInFormFieldDefinition[])
    : [];

  async function saveMode(nextMode: ApplicationFormMode) {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("applicationFormMode", nextMode);
    const res = await updateEventApplicationFormModeAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setMode(nextMode);
    router.refresh();
  }

  async function savePdfLink(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("applicationFormTemplateId", selectedPdf);
    const res = await linkEventApplicationFormTemplateAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    router.refresh();
  }

  async function loadDefaultForm() {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    const res = await loadDefaultBuiltInFormAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    router.refresh();
  }

  async function saveBuiltInFields(fields: BuiltInFormFieldDefinition[]) {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("fieldsJson", JSON.stringify(fields));
    if (builtInTitle) fd.set("title", builtInTitle);
    const res = await saveBuiltInFormFieldsAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    router.refresh();
  }

  const selectClass =
    "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm";

  return (
    <section className="space-y-6 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">대회 신청 방식</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          공식 신청서가 있는 대회는 PDF 신청서 방식을 사용하세요. 공식
          신청서가 없는 대회는 자체 웹 신청폼으로 신청을 받을 수 있습니다.
        </p>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={
            mode === ApplicationFormMode.official_pdf ? "default" : "outline"
          }
          size="sm"
          disabled={pending}
          onClick={() => void saveMode(ApplicationFormMode.official_pdf)}
        >
          공식 PDF 신청서
        </Button>
        <Button
          type="button"
          variant={
            mode === ApplicationFormMode.built_in_form ? "default" : "outline"
          }
          size="sm"
          disabled={pending}
          onClick={() => void saveMode(ApplicationFormMode.built_in_form)}
        >
          자체 웹 신청폼
        </Button>
      </div>

      {mode === ApplicationFormMode.official_pdf ? (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-semibold">공식 PDF 템플릿 연결</h3>
          {linkedPdf ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">연결됨: {linkedPdf.title}</p>
              <p className="text-muted-foreground text-xs">
                파일: {linkedPdf.originalPdfFileName ?? "—"} · 필드{" "}
                {linkedPdf.fieldCount}개
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              PDF 템플릿을 선택해 주세요. 좌표 편집은 관리자 화면에서
              진행합니다.
            </p>
          )}
          <form
            onSubmit={(e) => void savePdfLink(e)}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="min-w-[240px] flex-1 space-y-1 text-sm">
              <span className="font-medium">PDF 템플릿</span>
              <select
                value={selectedPdf}
                onChange={(e) => setSelectedPdf(e.target.value)}
                className={selectClass}
              >
                <option value="">연결 해제</option>
                {pdfTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={pending || pdfTemplates.length === 0}>
              저장
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-4 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">웹 신청폼 항목 구성</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void loadDefaultForm()}
            >
              기본 신청폼 불러오기
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            {builtInTitle ? `템플릿: ${builtInTitle}` : "템플릿이 자동 생성됩니다."}
          </p>
          <BuiltInFormFieldsEditor
            initialFields={initialFields}
            disabled={pending}
            onSave={(fields) => void saveBuiltInFields(fields)}
          />
        </div>
      )}
    </section>
  );
}
