import Link from "next/link";
import { formatUtcDateOnly } from "@/lib/date-only";
import { buttonVariants } from "@/components/ui/button";
import { matchonSectionTitleClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export type MemberAssignedStaffRow = {
  id: string;
  staffId: string;
  staffName: string;
  staffTitle: string | null;
  staffRoleLabel: string;
  assignmentTypeLabel: string;
  isPrimary: boolean;
  startedAt: Date;
};

export function GymMemberAssignedStaffSection({
  rows,
  isOwner,
}: {
  rows: MemberAssignedStaffRow[];
  isOwner: boolean;
}) {
  const primary = rows.find((r) => r.isPrimary) ?? null;
  const others = rows.filter((r) => !r.isPrimary);

  return (
    <section className="rounded-xl border border-matchon-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={matchonSectionTitleClass}>담당 선생님</h2>
        {isOwner ? (
          <Link
            href="/gym/staff"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            담당 관리
          </Link>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-matchon-text-secondary">
          지정된 담당 선생님이 없습니다.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          {primary ? (
            <div>
              <p className="text-xs text-matchon-text-secondary">주 담당</p>
              <p className="font-medium">
                {primary.staffName}
                {primary.staffTitle ? ` ${primary.staffTitle}` : " 선생님"}
              </p>
              <p className="text-xs text-matchon-text-secondary">
                {primary.staffRoleLabel} · {primary.assignmentTypeLabel} ·{" "}
                {formatUtcDateOnly(primary.startedAt, "-")}~
              </p>
            </div>
          ) : null}
          {others.length > 0 ? (
            <div>
              <p className="text-xs text-matchon-text-secondary">추가 담당</p>
              <ul className="mt-1 space-y-1">
                {others.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">
                      {r.staffName}
                      {r.staffTitle ? ` ${r.staffTitle}` : ""}
                    </span>
                    <span className="text-matchon-text-secondary">
                      {" "}
                      · {r.staffRoleLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
