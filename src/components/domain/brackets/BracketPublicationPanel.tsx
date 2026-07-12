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
  publicBracketCount,
  totalBracketCount,
}: {
  eventId: string;
  publicSlug: string;
  publicUnmatchedListEnabled: boolean;
  hasPublicBrackets: boolean;
  publicBracketCount: number;
  totalBracketCount: number;
}) {
  const publicBracketsUrl = `/events/${publicSlug}?tab=brackets`;

  return (
    <Card variant="default" className="py-4">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 px-4 pb-2">
        <div>
          <CardTitle className="text-lg">공개 설정</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm font-normal">
            대진표와 미매칭 명단의 공개 여부는 언제든 변경할 수 있습니다.
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
              {hasPublicBrackets
                ? `대진표는 공개 중입니다. (${publicBracketCount}/${totalBracketCount}개 그룹)`
                : totalBracketCount > 0
                  ? "대진표는 비공개입니다."
                  : "생성된 대진표가 없습니다."}
            </p>
            <div className="flex flex-wrap gap-2">
              {totalBracketCount > 0 && !hasPublicBrackets ? (
                <form action={publishAllEventBracketsFormAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <Button type="submit" size="sm">
                    대진표 전체 공개
                  </Button>
                </form>
              ) : null}
              {hasPublicBrackets ? (
                <form action={unpublishAllEventBracketsFormAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <Button type="submit" size="sm" variant="secondary">
                    대진표 전체 비공개
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
