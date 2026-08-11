"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionTemplateDetailVM } from "@/lib/services/division-template.service";
import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import { sanitizeTemplateItems } from "@/lib/division-template/division-template-row";
import {
  DivisionTemplatePreview,
  WeightClassRowsEditor,
} from "@/components/domain/division-templates/WeightClassRowsEditor";
import { DivisionTemplateExcelToolbar } from "@/components/domain/division-templates/DivisionTemplateExcelImportDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createDivisionTemplateAction,
  updateDivisionTemplateAction,
} from "@/features/division-templates/actions";

const fieldClass = cn(
  "border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-sm",
);

export function DivisionTemplateEditor({
  mode,
  initial,
  organizerIdForAdmin,
}: {
  mode: "create" | "edit";
  initial?: DivisionTemplateDetailVM;
  organizerIdForAdmin?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [sportType, setSportType] = useState(initial?.sportType ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [items, setItems] = useState<DivisionTemplateItemInput[]>(
    initial?.items ?? [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        sanitizeTemplateItems(items, sportType).filter(
          (i) => i.isActive !== false,
        ),
      ),
    [items, sportType],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData();
    if (mode === "edit" && initial) {
      fd.set("templateId", initial.id);
    }
    fd.set("title", title);
    fd.set("sportType", sportType);
    fd.set("description", description);
    fd.set("itemsJson", itemsJson);
    if (isActive) fd.set("isActive", "on");
    if (organizerIdForAdmin) fd.set("organizerId", organizerIdForAdmin);

    const res =
      mode === "create"
        ? await createDivisionTemplateAction(fd)
        : await updateDivisionTemplateAction(fd);

    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }

    if (mode === "create" && "templateId" in res.data) {
      router.push(`/organizer/division-templates/${res.data.templateId}`);
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

      <section className="rounded-xl border bg-muted/10 p-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          체급표는 대회 경기구분을 빠르게 생성하기 위한 템플릿입니다.
          <br />
          &ldquo;묶음 생성&rdquo;으로 개별 입력하거나, 엑셀 샘플을 내려받아
          일괄 업로드할 수 있습니다.
          <br />
          저장된 체급표는 대회 생성 또는 수정 시 불러와 경기구분으로 생성할 수
          있습니다.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm md:col-span-2">
          <span className="font-medium">템플릿명</span>
          <input
            required
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">종목</span>
          <input
            className={fieldClass}
            value={sportType}
            onChange={(e) => setSportType(e.target.value)}
            placeholder="킥복싱"
            maxLength={120}
          />
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          활성 템플릿
        </label>
        <label className="block space-y-1 text-sm md:col-span-2">
          <span className="font-medium">설명 (선택)</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">체급 입력</h2>
          <DivisionTemplateExcelToolbar
            sportType={sportType}
            items={items}
            onApplyItems={setItems}
            persistAfterApply={
              mode === "edit" && initial
                ? async (next) => {
                    const fd = new FormData();
                    fd.set("templateId", initial.id);
                    fd.set("title", title.trim() || initial.title);
                    fd.set("sportType", sportType);
                    fd.set("description", description);
                    fd.set(
                      "itemsJson",
                      JSON.stringify(
                        sanitizeTemplateItems(next, sportType).filter(
                          (i) => i.isActive !== false,
                        ),
                      ),
                    );
                    if (isActive) fd.set("isActive", "on");
                    const res = await updateDivisionTemplateAction(fd);
                    if (!res.ok) {
                      return { ok: false, message: res.error.message };
                    }
                    router.refresh();
                    return { ok: true };
                  }
                : undefined
            }
          />
        </div>
        <WeightClassRowsEditor
          sportType={sportType}
          items={items}
          onChange={setItems}
        />
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">미리보기</h2>
        <DivisionTemplatePreview items={items} sportType={sportType} />
      </section>

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : mode === "create" ? "템플릿 저장" : "변경 저장"}
      </Button>
    </form>
  );
}
