import Link from "next/link";
import {
  publishAllEventBracketsFormAction,
  setPublicUnmatchedListFormAction,
  unpublishAllEventBracketsFormAction,
} from "@/features/brackets/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BracketPublicationPanel({
  eventId,
  publicSlug,
  publicUnmatchedListEnabled,
  hasPublicBrackets,
  totalBracketCount,
}: {
  eventId: string;
  publicSlug: string;
  publicUnmatchedListEnabled: boolean;
  hasPublicBrackets: boolean;
  totalBracketCount: number;
}) {
  const publicBracketsUrl = `/events/${publicSlug}?tab=brackets`;

  return (
    <Card variant="default" className="py-4">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 px-4 pb-2">
        <div>
          <CardTitle className="text-lg">대진표 기본 설정</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm font-normal">
            대진표 공개는 대회 단위로만 설정합니다. 그룹별 부분 공개는 지원하지
            않습니다.
          </p>
        </div>
        <Link
          href={publicBracketsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          공개 페이지 보기
        </Link>
      </CardHeader>

      <CardContent className="grid gap-4 px-4 md:grid-cols-2">
        <Card variant="muted" className="py-4">
          <CardContent className="space-y-3 px-4">
            <p className="text-sm font-medium">대진표 공개</p>
            <p className="text-muted-foreground text-xs">
              공개하면 참가자 및 공개 페이지에서 대진표를 확인할 수 있습니다.
            </p>
            <p className="text-muted-foreground text-xs">
              {hasPublicBrackets
                ? "현재: 공개 — 공개 가능한 전체 대진표 그룹이 노출됩니다."
                : totalBracketCount > 0
                  ? "현재: 비공개 — 모든 대진표 그룹이 비공개입니다."
                  : "생성된 대진표가 없습니다."}
            </p>
            <div className="flex flex-wrap gap-2">
              {totalBracketCount > 0 && !hasPublicBrackets ? (
                <form action={publishAllEventBracketsFormAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <Button type="submit" size="sm">
                    공개 (ON)
                  </Button>
                </form>
              ) : null}
              {hasPublicBrackets ? (
                <form action={unpublishAllEventBracketsFormAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <Button type="submit" size="sm" variant="secondary">
                    비공개 (OFF)
                  </Button>
                </form>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card variant="muted" className="py-4">
          <CardContent className="space-y-3 px-4">
            <p className="text-sm font-medium">미매칭 리스트 공개</p>
            <p className="text-muted-foreground text-xs">
              {publicUnmatchedListEnabled
                ? "미매칭 리스트는 공개 중입니다."
                : "미매칭 리스트는 비공개입니다."}
            </p>
            <div className="flex flex-wrap gap-2">
              {!publicUnmatchedListEnabled ? (
                <form action={setPublicUnmatchedListFormAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="enabled" value="true" />
                  <Button type="submit" size="sm">
                    미매칭 리스트 공개
                  </Button>
                </form>
              ) : (
                <form action={setPublicUnmatchedListFormAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="enabled" value="false" />
                  <Button type="submit" size="sm" variant="secondary">
                    미매칭 리스트 비공개
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
