import type { FighterOfficialRecord } from "@/lib/fighter-unified-profile/types";
import { formatRecordBoutsSummary } from "@/lib/fighter-unified-profile/record-utils";
import { FighterCareerSummary } from "@/components/domain/fighters/career/FighterCareerSummary";
import {
  fighterCareerMutedClass,
  fighterCareerSectionClass,
  fighterCareerSectionTitleClass,
} from "@/lib/ui/fighter-career-ui";

type TierProps = {
  title: string;
  record: FighterOfficialRecord;
  description?: string;
};

function CareerTier({ title, record, description }: TierProps) {
  return (
    <div className={fighterCareerSectionClass}>
      <h3 className={fighterCareerSectionTitleClass}>{title}</h3>
      <p className="mb-2 text-sm font-medium tabular-nums text-matchon-text-primary">
        {formatRecordBoutsSummary(record)}
      </p>
      {description ? (
        <p className={`${fighterCareerMutedClass} mb-3 leading-relaxed`}>
          {description}
        </p>
      ) : null}
      <FighterCareerSummary record={record} />
    </div>
  );
}

export function FighterCareerRecordsOverview({
  combinedRecord,
  officialRecord,
  externalRecord,
  externalLabel = "기존/외부 전적",
}: {
  combinedRecord: FighterOfficialRecord;
  officialRecord: FighterOfficialRecord;
  externalRecord: FighterOfficialRecord;
  externalLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <CareerTier title="전체" record={combinedRecord} />
      <CareerTier
        title="MATCHON 공식"
        record={officialRecord}
        description="MatchResult 확정·정정 기준. 수정할 수 없습니다."
      />
      <CareerTier
        title={externalLabel}
        record={externalRecord}
        description="MATCHON 외 경기 또는 체육관 등록 전적입니다."
      />
    </div>
  );
}
