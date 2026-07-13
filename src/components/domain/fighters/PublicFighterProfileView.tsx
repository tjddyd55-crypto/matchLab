import Image from "next/image";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FighterSnsLinks } from "@/components/domain/fighters/FighterSnsLinks";
import type { PublicFighterProfileDTO } from "@/lib/services/fighter-profile.service";
import { matchonStatCardClass } from "@/lib/ui/matchon-shell-ui";

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-matchon-text-secondary">{label}</dt>
      <dd className="text-sm font-medium text-matchon-text-primary">{value}</dd>
    </div>
  );
}

export function PublicFighterProfileView({
  profile,
}: {
  profile: PublicFighterProfileDTO;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl">
      {/* Hero — 모바일: 세로 / PC: 가로 */}
      <section className={matchonStatCardClass}>
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
          <div className="mx-auto shrink-0 md:mx-0">
            {profile.profileImageUrl ? (
              <div className="relative size-36 overflow-hidden rounded-2xl ring-1 ring-foreground/10 md:size-44 md:rounded-3xl">
                <Image
                  src={profile.profileImageUrl}
                  alt={`${profile.displayName} 프로필 사진`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 144px, 176px"
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <div className="flex size-36 items-center justify-center rounded-2xl border border-dashed bg-muted/40 text-sm text-muted-foreground md:size-44 md:rounded-3xl">
                사진 없음
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3 text-center md:text-left">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                {profile.displayName}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {[profile.gymName, profile.regionLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {profile.recordSummary}
            </p>
            <FighterSnsLinks
              instagram={profile.snsInstagram}
              youtube={profile.snsYoutube}
              tiktok={profile.snsTiktok}
            />
          </div>
        </div>
      </section>

      {/* 상세 정보 */}
      <section className="mt-6 space-y-6">
        <div className="ring-foreground/10 rounded-xl bg-card p-5 ring-1 md:p-6">
          <h2 className="mb-4 text-sm font-semibold">선수 정보</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <MetaItem label="성별" value={profile.gender} />
            <MetaItem label="연령부" value={profile.ageGroup} />
            <MetaItem label="체급/체중" value={profile.weightLabel} />
            {profile.primarySport ? (
              <MetaItem label="주종목" value={profile.primarySport} />
            ) : null}
            {profile.gymName ? (
              <MetaItem label="소속 체육관" value={profile.gymName} />
            ) : null}
            {profile.regionLabel ? (
              <MetaItem label="지역" value={profile.regionLabel} />
            ) : null}
          </dl>
        </div>

        {profile.bio ? (
          <div className="ring-foreground/10 rounded-xl bg-card p-5 ring-1 md:p-6">
            <h2 className="mb-3 text-sm font-semibold">자기소개</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {profile.bio}
            </p>
          </div>
        ) : null}

        {profile.recentEvents.length > 0 ? (
          <div className="ring-foreground/10 rounded-xl bg-card p-5 ring-1 md:p-6">
            <h2 className="mb-3 text-sm font-semibold">최근 참가 대회</h2>
            <ul className="space-y-2">
              {profile.recentEvents.map((e, i) => (
                <li
                  key={`${e.eventTitle}-${i}`}
                  className="flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{e.eventTitle}</span>
                  <span className="text-muted-foreground text-xs">
                    {e.divisionLabel}
                    {e.eventDateIso
                      ? ` · ${format(new Date(e.eventDateIso), "yyyy.MM.dd", { locale: ko })}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {profile.recentResults.length > 0 ? (
          <div className="ring-foreground/10 rounded-xl bg-card p-5 ring-1 md:p-6">
            <h2 className="mb-3 text-sm font-semibold">최근 경기 결과</h2>
            <ul className="space-y-2">
              {profile.recentResults.map((r, i) => (
                <li
                  key={`${r.eventTitle}-${r.matchDateIso}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.eventTitle}</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(r.matchDateIso), "yyyy.MM.dd", {
                        locale: ko,
                      })}
                    </p>
                  </div>
                  <span
                    className={
                      r.outcomeLabel === "승"
                        ? "font-semibold text-emerald-600"
                        : r.outcomeLabel === "패"
                          ? "text-muted-foreground"
                          : "font-medium"
                    }
                  >
                    {r.outcomeLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </article>
  );
}
