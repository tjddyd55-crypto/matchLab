"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionTemplateDetailVM } from "@/lib/services/division-template.service";
import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import {
  DIVISION_TEMPLATE_SPORT_LABELS,
  DIVISION_TEMPLATE_SPORT_TYPES,
  type DivisionTemplateSportType,
} from "@/lib/division-template/division-template-constants";
import { getDivisionTemplateExampleBundle } from "@/lib/division-template/division-template-examples";
import { sanitizeTemplateItems } from "@/lib/division-template/division-template-row";
import {
  DivisionTemplatePreview,
  WeightClassRowsEditor,
} from "@/components/domain/division-templates/WeightClassRowsEditor";
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
  const [sportType, setSportType] = useState(
    initial?.sportType ?? "muaythai",
  );
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

  function loadExample(sport: Exclude<DivisionTemplateSportType, "custom">) {
    const bundle = getDivisionTemplateExampleBundle(sport);
    setTitle(bundle.title);
    setSportType(bundle.sportType);
    setDescription(bundle.description);
    setItems(bundle.items);
  }

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

      <section className="space-y-3 rounded-xl border bg-muted/10 p-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          체급표는 대회 경기구분을 빠르게 생성하기 위한 템플릿입니다.
          <br />
          주최측 기준에 맞게 초등부, 중등부, 고등부, 대학·일반부와 남성/여성
          체급을 입력해 저장할 수 있습니다.
          <br />
          저장된 체급표는 대회 생성 또는 수정 시 불러와 경기구분으로 생성할 수
          있습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["muaythai", "kickboxing", "boxing"] as const).map((sport) => (
            <Button
              key={sport}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadExample(sport)}
            >
              {DIVISION_TEMPLATE_SPORT_LABELS[sport]} 예시 불러오기
            </Button>
          ))}
        </div>
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
          <select
            className={fieldClass}
            value={sportType}
            onChange={(e) => setSportType(e.target.value)}
          >
            {DIVISION_TEMPLATE_SPORT_TYPES.map((s) => (
              <option key={s} value={s}>
                {DIVISION_TEMPLATE_SPORT_LABELS[s]}
              </option>
            ))}
          </select>
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
        <h2 className="text-lg font-semibold">체급 입력</h2>
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
