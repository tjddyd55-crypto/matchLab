import type { FighterUnifiedProfileView } from "@/lib/fighter-unified-profile/types";
import { FighterAffiliationHistoryList } from "@/components/domain/fighters/career/FighterAffiliationHistoryList";
import { FighterCareerRecordsOverview } from "@/components/domain/fighters/career/FighterCareerRecordsOverview";
import { FighterEventHistoryTable } from "@/components/domain/fighters/career/FighterEventHistoryTable";
import { FighterPublicProfileLink } from "@/components/domain/fighters/career/FighterPublicProfileLink";
import { FighterRecentMatchesTable } from "@/components/domain/fighters/career/FighterRecentMatchesTable";
import {
  fighterCareerMutedClass,
  fighterCareerPanelClass,
  fighterCareerSectionClass,
  fighterCareerSectionTitleClass,
} from "@/lib/ui/fighter-career-ui";

type Props = {
  profile: FighterUnifiedProfileView;
  showIdentityMeta?: boolean;
  recentMatchLimit?: number;
  eventHistoryLimit?: number;
};

export function FighterUnifiedCareerPanel({
  profile,
  showIdentityMeta = false,
  recentMatchLimit = 20,
  eventHistoryLimit = 30,
}: Props) {
  const {
    identity,
    officialRecord,
    externalRecord,
    combinedRecord,
    recentMatches,
    eventHistory,
    affiliationHistory,
  } = profile;
  const recent = recentMatches.slice(0, recentMatchLimit);
  const events = eventHistory.slice(0, eventHistoryLimit);

  return (
    <div className={fighterCareerPanelClass}>
      {showIdentityMeta ? (
        <div className={fighterCareerSectionClass}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-matchon-text-primary">
                {identity.name}
              </h2>
              <p className={fighterCareerMutedClass}>
                {[identity.currentGym?.name, identity.primarySport, identity.status]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {identity.birthDate ? (
                <p className={fighterCareerMutedClass}>
                  {identity.gender} · {identity.birthDate}
                  {identity.weightKg != null ? ` · ${identity.weightKg}kg` : ""}
                </p>
              ) : null}
              {identity.phone ? (
                <p className={fighterCareerMutedClass}>연락처: {identity.phone}</p>
              ) : null}
            </div>
            <FighterPublicProfileLink profile={identity.publicProfile} />
          </div>
        </div>
      ) : null}

      <section className={fighterCareerSectionClass}>
        <h3 className={fighterCareerSectionTitleClass}>전적</h3>
        <FighterCareerRecordsOverview
          combinedRecord={combinedRecord}
          officialRecord={officialRecord}
          externalRecord={externalRecord}
        />
        {!showIdentityMeta && identity.publicProfile.href ? (
          <div className="mt-3">
            <FighterPublicProfileLink profile={identity.publicProfile} />
          </div>
        ) : null}
      </section>

      <section className={fighterCareerSectionClass}>
        <h3 className={fighterCareerSectionTitleClass}>최근 경기</h3>
        <FighterRecentMatchesTable matches={recent} />
      </section>

      <section className={fighterCareerSectionClass}>
        <h3 className={fighterCareerSectionTitleClass}>대회 참가 이력</h3>
        <FighterEventHistoryTable rows={events} />
      </section>

      {affiliationHistory.length > 1 ? (
        <section className={fighterCareerSectionClass}>
          <h3 className={fighterCareerSectionTitleClass}>소속 이력</h3>
          <FighterAffiliationHistoryList rows={affiliationHistory} />
        </section>
      ) : null}
    </div>
  );
}
