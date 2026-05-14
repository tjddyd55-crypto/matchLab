"use client";

import { useActionState } from "react";
import { createFighterInviteLinkAction } from "@/features/registrations/actions";
import { Button } from "@/components/ui/button";
import { CopyInviteUrlButton } from "@/components/domain/gym/CopyInviteUrlButton";
import { cn } from "@/lib/utils";

export function InviteLinkCreateForm({ baseUrl }: { baseUrl: string }) {
  const [state, formAction, pending] = useActionState(
    createFighterInviteLinkAction,
    null,
  );

  const token = state?.ok === true ? state.data.token : null;
  const fullUrl = token
    ? `${baseUrl.replace(/\/$/, "")}/fighter-registration/${token}`
    : null;

  return (
    <div className="ring-foreground/10 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">새 선수 등록 초대 링크</h2>
      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      {fullUrl ? (
        <div className="bg-muted/40 space-y-2 rounded-lg p-3 text-sm">
          <p className="font-mono text-xs break-all">{fullUrl}</p>
          <CopyInviteUrlButton url={fullUrl} />
        </div>
      ) : null}
      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">만료일시 (선택)</span>
          <input
            type="datetime-local"
            name="expiresAt"
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">최대 사용 횟수 (선택)</span>
          <input
            type="number"
            name="maxUses"
            min={1}
            placeholder="비우면 무제한"
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
            )}
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "생성 중…" : "링크 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
