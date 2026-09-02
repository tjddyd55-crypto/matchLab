"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  createAssociationNoticeAction,
  updateAssociationNoticeAction,
} from "@/features/association-notices/actions";
import { Button } from "@/components/ui/button";
import {
  matchonFieldInputClass,
  matchonFieldSelectClass,
} from "@/lib/ui/matchon-shell-ui";

export function AssociationNoticeForm({
  mode,
  noticeId,
  initial,
  formOptions = [],
}: {
  mode: "create" | "edit";
  noticeId?: string;
  initial?: {
    title: string;
    content: string;
    isPinned: boolean;
    relatedFormId?: string | null;
  };
  formOptions?: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false);
  const [relatedFormId, setRelatedFormId] = useState(
    initial?.relatedFormId ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    formData.set("isPinned", isPinned ? "true" : "false");
    formData.set("relatedFormId", relatedFormId);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAssociationNoticeAction(formData)
          : await updateAssociationNoticeAction(noticeId!, formData);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      router.push(`/organizer/notices/${result.data.noticeId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-5">
      {message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
      <div className="space-y-2">
        <label
          htmlFor="notice-title"
          className="text-sm font-semibold text-matchon-text-primary"
        >
          제목
        </label>
        <input
          id="notice-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          placeholder="공지 제목"
          className={matchonFieldInputClass}
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="notice-content"
          className="text-sm font-semibold text-matchon-text-primary"
        >
          내용
        </label>
        <textarea
          id="notice-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={14}
          className={`${matchonFieldInputClass} min-h-[220px] whitespace-pre-wrap`}
          placeholder="회원 체육관에 전달할 내용을 입력하세요."
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-matchon-text-primary">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="size-4 rounded border-matchon-border"
        />
        상단 고정
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-semibold text-matchon-text-primary">
          신청 폼 연결 (선택)
        </span>
        <select
          value={relatedFormId}
          onChange={(e) => setRelatedFormId(e.target.value)}
          className={matchonFieldSelectClass}
        >
          <option value="">연결 없음</option>
          {formOptions.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/organizer/notices")}
        >
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : mode === "create" ? "등록" : "저장"}
        </Button>
      </div>
    </form>
  );
}
