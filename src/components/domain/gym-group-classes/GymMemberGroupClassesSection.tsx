import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { matchonSectionTitleClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export type MemberGroupClassItem = {
  id: string;
  classId: string;
  title: string;
  status: string;
  statusLabel: string;
  dateKey: string;
  timeRangeLabel: string;
  instructorName: string | null;
};

export function GymMemberGroupClassesSection({
  items,
  canCreate,
}: {
  items: MemberGroupClassItem[];
  canCreate: boolean;
}) {
  return (
    <section className="rounded-xl border border-matchon-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={matchonSectionTitleClass}>예정된 그룹수업</h2>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Link
              href="/gym/group-classes"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              그룹수업 추가
            </Link>
          ) : null}
          <Link
            href="/gym/group-classes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            전체 그룹수업 보기
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-matchon-text-secondary">
          향후 30일 내 예정된 그룹수업이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/gym/group-classes/${item.classId}`}
                className="block rounded-lg border border-matchon-border px-3 py-2 text-sm transition-colors hover:bg-matchon-surface/40"
              >
                <p className="font-medium">
                  {item.dateKey} · {item.timeRangeLabel}
                </p>
                <p className="truncate text-matchon-text-secondary">
                  {item.title}
                  {item.instructorName ? ` · ${item.instructorName}` : ""} ·{" "}
                  {item.statusLabel}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
