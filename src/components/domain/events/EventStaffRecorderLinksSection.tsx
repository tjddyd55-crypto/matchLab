"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createStaffRecorderLinkAction,
  revokeStaffRecorderLinkAction,
} from "@/features/event-staff/actions";
import type { ActionResult } from "@/lib/action-result";
import type { EventStaffLinkListItemVM } from "@/lib/services/event-staff-access.service";
import { CopyInviteUrlButton } from "@/components/domain/gym/CopyInviteUrlButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function RevokeStaffLinkButton({
  eventId,
  linkId,
}: {
  eventId: string;
  linkId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    revokeStaffRecorderLinkAction,
    null as ActionResult<{ ok: true }> | null,
  );

  useEffect(() => {
    if (state?.ok === true) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="linkId" value={linkId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "처리 중…" : "폐기"}
      </Button>
    </form>
  );
}

function permissionLabel(link: EventStaffLinkListItemVM) {
  const parts: string[] = [];
  if (link.canChangeMatchStatus) parts.push("상태");
  if (link.canRecordOutcomeDraft) parts.push("임시결과");
  if (link.canConfirmResult) parts.push("확정");
  return parts.length ? parts.join(" · ") : "조회만";
}

export function EventStaffRecorderLinksSection({
  eventId,
  baseUrl,
  links,
}: {
  eventId: string;
  baseUrl: string;
  links: EventStaffLinkListItemVM[];
}) {
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const root = baseUrl.replace(/\/$/, "");

  const [createState, createAction, createPending] = useActionState(
    createStaffRecorderLinkAction,
    null as ActionResult<{ token: string; urlPath: string }> | null,
  );

  useEffect(() => {
    if (createState?.ok === true) {
      createFormRef.current?.reset();
      router.refresh();
    }
  }, [createState, router]);

  const createdUrl =
    createState?.ok === true
      ? `${root}${createState.data.urlPath}`
      : null;

  return (
    <section
      id="setup-staff-links"
      className="ring-foreground/10 scroll-mt-24 space-y-6 rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">결과 입력 링크 (스태프)</h2>
        <p className="text-muted-foreground text-sm">
          계정 없이 경기 상태·임시 결과·(허용 시) 확정까지 처리할 수 있는 전용
          URL입니다. 전달 경로가 열려 있다면 만료·접속 코드·폐기를 함께
          사용하는 것을 권장합니다.
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm">
        목록의 전체 URL에는 비밀 토큰이 포함됩니다. 타인에게 보이는 화면·로그에
        노출되지 않도록 주의해 주세요.
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">발급된 링크</h3>
        {links.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 없습니다.</p>
        ) : (
          <ul className="divide-border divide-y rounded-lg border">
            {links.map((l) => {
              const staffUrl = `${root}/staff/result/${l.token}/matches`;
              return (
                <li
                  key={l.id}
                  className="flex flex-col gap-3 px-3 py-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{l.label}</p>
                    <p className="text-muted-foreground text-xs">
                      권한: {permissionLabel(l)}
                      {l.hasAccessCode ? " · 접속 코드 설정됨" : ""}
                      {l.revokedAt ? (
                        <span className="text-destructive"> · 폐기됨</span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground font-mono text-xs break-all">
                      …{l.tokenPreviewSuffix}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!l.revokedAt ? (
                      <>
                        <CopyInviteUrlButton url={staffUrl} />
                        <RevokeStaffLinkButton eventId={eventId} linkId={l.id} />
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-medium">새 링크 만들기</h3>
        {createState?.ok === false ? (
          <p className="text-destructive text-sm">{createState.error.message}</p>
        ) : null}
        {createdUrl ? (
          <div className="bg-muted/40 space-y-2 rounded-lg p-3 text-sm">
            <p className="font-medium text-green-700 dark:text-green-400">
              링크가 생성되었습니다.
            </p>
            <p className="font-mono text-xs break-all">{createdUrl}</p>
            <CopyInviteUrlButton url={createdUrl} />
          </div>
        ) : null}

        <form ref={createFormRef} action={createAction} className="grid gap-3">
          <input type="hidden" name="eventId" value={eventId} />

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">구분 라벨 (예: 테이블 A)</span>
            <input
              name="label"
              required
              maxLength={120}
              placeholder="현장에서 구분할 이름"
              className={cn(
                "border-input bg-background h-10 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">만료일시 (선택)</span>
            <input
              type="datetime-local"
              name="expiresAt"
              className={cn(
                "border-input bg-background h-10 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">접속 코드 (선택)</span>
            <input
              name="accessCode"
              autoComplete="off"
              maxLength={64}
              placeholder="비우면 코드 없이 열림"
              className={cn(
                "border-input bg-background h-10 w-full rounded-md border px-3 text-sm shadow-sm",
              )}
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">경기 상태 변경</span>
              <select
                name="canChangeMatchStatus"
                defaultValue="true"
                className={cn(
                  "border-input bg-background h-10 w-full rounded-md border px-2 text-sm shadow-sm",
                )}
              >
                <option value="true">허용</option>
                <option value="false">불가</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">임시 결과 입력</span>
              <select
                name="canRecordOutcomeDraft"
                defaultValue="true"
                className={cn(
                  "border-input bg-background h-10 w-full rounded-md border px-2 text-sm shadow-sm",
                )}
              >
                <option value="true">허용</option>
                <option value="false">불가</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">결과 확정</span>
              <select
                name="canConfirmResult"
                defaultValue="false"
                className={cn(
                  "border-input bg-background h-10 w-full rounded-md border px-2 text-sm shadow-sm",
                )}
              >
                <option value="false">불가 (주최자 확정)</option>
                <option value="true">허용</option>
              </select>
            </label>
          </div>

          <div>
            <Button type="submit" disabled={createPending}>
              {createPending ? "생성 중…" : "링크 생성"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
