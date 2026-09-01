import type { FighterOfficialRecord } from "@/lib/fighter-unified-profile/types";
import {
  fighterCareerSummaryCellClass,
  fighterCareerSummaryGridClass,
  fighterCareerSummaryLabelClass,
  fighterCareerSummaryValueClass,
} from "@/lib/ui/fighter-career-ui";

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className={fighterCareerSummaryCellClass}>
      <div className={fighterCareerSummaryValueClass}>{value}</div>
      <div className={fighterCareerSummaryLabelClass}>{label}</div>
    </div>
  );
}

export function FighterCareerSummary({
  record,
}: {
  record: FighterOfficialRecord;
}) {
  return (
    <div className={fighterCareerSummaryGridClass}>
      <StatCell label="경기" value={record.bouts} />
      <StatCell label="승" value={record.wins} />
      <StatCell label="패" value={record.losses} />
      <StatCell label="무" value={record.draws} />
      <StatCell label="NC" value={record.noContests} />
    </div>
  );
}
