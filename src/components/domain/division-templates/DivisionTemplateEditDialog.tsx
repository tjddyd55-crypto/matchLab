"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionTemplateDetailVM } from "@/lib/services/division-template.service";
import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import { DivisionTemplateItemsEditor } from "@/components/domain/division-templates/DivisionTemplateItemsEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateDivisionTemplateAction } from "@/features/division-templates/actions";

function sanitizeItems(rows: DivisionTemplateItemInput[]) {
  return rows.filter((r) => r.sportType.trim().length > 0);
}

export function DivisionTemplateEditDialog({
  template,
}: {
  template: DivisionTemplateDetailVM;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(template.title);
  const [sportType, setSportType] = useState(template.sportType ?? "");
  const [description, setDescription] = useState(template.description ?? "");
  const [items, setItems] = useState<DivisionTemplateItemInput[]>(
    template.items.length > 0
      ? template.items
      : [
          {
            sportType: "",
            ruleType: null,
            gender: null,
            ageGroup: null,
            weightClass: null,
            skillLevel: null,
          },
        ],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsJson = useMemo(
    () => JSON.stringify(sanitizeItems(items)),
    [items],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("templateId", template.id);
    fd.set("title", title);
    fd.set("sportType", sportType);
    fd.set("description", description);
    fd.set("itemsJson", itemsJson);

    const res = await updateDivisionTemplateAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        수정
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>템플릿 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground text-xs">제목</span>
              <input
                required
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground text-xs">종목 (선택)</span>
              <input
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={sportType}
                onChange={(e) => setSportType(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground text-xs">설명 (선택)</span>
            <textarea
              className="border-input bg-background min-h-[72px] w-full rounded-md border px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </label>
          <DivisionTemplateItemsEditor items={items} onChange={setItems} />
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : "변경 저장"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
