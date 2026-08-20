"use client";

import { useActionState } from "react";
import { createFighterInviteLinkAction } from "@/features/registrations/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyInviteUrlButton } from "@/components/domain/gym/CopyInviteUrlButton";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { matchonSectionTitleClass } from "@/lib/ui/matchon-layout";

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
    <Card>
      <CardHeader>
        <CardTitle className={matchonSectionTitleClass}>
          새 선수 등록 초대 링크
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {state?.ok === false ? (
          <p className="text-destructive text-sm">{state.error.message}</p>
        ) : null}
        {fullUrl ? (
          <div className="space-y-2 rounded-lg border border-matchon-border bg-matchon-primary-light/25 p-3 text-sm">
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
              className={matchonFieldInputClass}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">최대 사용 횟수 (선택)</span>
            <input
              type="number"
              name="maxUses"
              min={1}
              placeholder="비우면 무제한"
              className={matchonFieldInputClass}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="default" disabled={pending}>
              {pending ? "생성 중…" : "링크 생성"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
