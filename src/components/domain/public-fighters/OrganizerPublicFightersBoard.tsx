"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type {
  OrganizerPublicFighterDetailDTO,
  OrganizerPublicFighterListItemDTO,
} from "@/lib/services/public-fighter.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FilterOptions = {
  gyms: { id: string; name: string; regionLabel: string }[];
};

const GENDER_OPTIONS = ["male", "female"] as const;
const AGE_GROUPS = ["초등부", "중등부", "고등부", "일반부"] as const;

export function OrganizerPublicFightersBoard({
  items,
  filterOptions,
  loadDetail,
}: {
  items: OrganizerPublicFighterListItemDTO[];
  filterOptions: FilterOptions;
  loadDetail: (fighterId: string) => Promise<OrganizerPublicFighterDetailDTO>;
}) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [gymId, setGymId] = useState("");
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [weightClass, setWeightClass] = useState("");
  const [sportType, setSportType] = useState("");
  const [hasRecent, setHasRecent] = useState("");
  const [detail, setDetail] = useState<OrganizerPublicFighterDetailDTO | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const g of filterOptions.gyms) {
      if (g.regionLabel) set.add(g.regionLabel);
    }
    for (const item of items) {
      if (item.regionLabel) set.add(item.regionLabel);
    }
    return [...set].sort();
  }, [filterOptions.gyms, items]);

  const sportTypes = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.sportType) set.add(item.sportType);
    }
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (gymId && row.gymId !== gymId) return false;
      if (gender && row.gender !== gender) return false;
      if (ageGroup && row.ageGroup !== ageGroup) return false;
      if (weightClass && !row.weightClassLabel.includes(weightClass)) {
        return false;
      }
      if (region && !row.regionLabel.includes(region)) return false;
      if (sportType && row.sportType !== sportType) return false;
      if (hasRecent === "yes" && !row.recentEventTitle) return false;
      if (hasRecent === "no" && row.recentEventTitle) return false;
      if (q) {
        const hay = `${row.name} ${row.gymName} ${row.regionLabel}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [
    items,
    q,
    region,
    gymId,
    gender,
    ageGroup,
    weightClass,
    sportType,
    hasRecent,
  ]);

  function openDetail(fighterId: string) {
    startTransition(async () => {
      const d = await loadDetail(fighterId);
      setDetail(d);
      setDetailOpen(true);
    });
  }

  const selectClass =
    "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">선수명·체육관 검색</span>
          <input
            className={selectClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름, 체육관, 지역"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">지역</span>
          <select
            className={selectClass}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">전체</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">체육관</span>
          <select
            className={selectClass}
            value={gymId}
            onChange={(e) => setGymId(e.target.value)}
          >
            <option value="">전체</option>
            {filterOptions.gyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">성별</span>
          <select
            className={selectClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">전체</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">연령부</span>
          <select
            className={selectClass}
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
          >
            <option value="">전체</option>
            {AGE_GROUPS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">체급(kg)</span>
          <input
            className={selectClass}
            value={weightClass}
            onChange={(e) => setWeightClass(e.target.value)}
            placeholder="예: 60"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">종목</span>
          <select
            className={selectClass}
            value={sportType}
            onChange={(e) => setSportType(e.target.value)}
          >
            <option value="">전체</option>
            {sportTypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">최근 참가</span>
          <select
            className={selectClass}
            value={hasRecent}
            onChange={(e) => setHasRecent(e.target.value)}
          >
            <option value="">전체</option>
            <option value="yes">있음</option>
            <option value="no">없음</option>
          </select>
        </label>
      </section>

      <p className="text-muted-foreground text-sm leading-relaxed">
        주최자 공개 선수 {filtered.length}명 — 체육관이{" "}
        <span className="font-medium text-foreground">주최자 공개</span>를 허용한
        선수입니다.{" "}
        <span className="font-medium text-foreground">일반 공개 프로필</span>
        (FighterProfile.isPublic)이 켜진 경우에만 공개 프로필 링크가
        표시됩니다.
      </p>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          조건에 맞는 공개 선수가 없습니다.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <article
              key={row.fighterId}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                {row.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.profileImageUrl}
                    alt=""
                    className="size-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="bg-muted size-12 rounded-lg" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{row.name}</h3>
                  <p className="text-muted-foreground text-xs">
                    {row.gender} · {row.ageGroup} · {row.weightClassLabel}
                  </p>
                  <p className="text-xs">{row.recordSummary}</p>
                </div>
              </div>
              <dl className="grid gap-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">체육관</dt>
                  <dd className="text-right font-medium">{row.gymName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">지역</dt>
                  <dd>{row.regionLabel}</dd>
                </div>
                {row.recentEventTitle ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">최근 대회</dt>
                    <dd className="text-right">{row.recentEventTitle}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => openDetail(row.fighterId)}
                >
                  상세 보기
                </Button>
                {row.publicProfileUrl ? (
                  <Link
                    href={row.publicProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs underline-offset-4 hover:underline"
                  >
                    공개 프로필
                  </Link>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    공개 프로필 OFF
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
              </DialogHeader>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">성별 / 연령부</dt>
                  <dd>
                    {detail.gender} · {detail.ageGroup}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">체급 / 키</dt>
                  <dd>
                    {detail.weightClassLabel}
                    {detail.heightCm != null
                      ? ` · ${detail.heightCm}cm`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">전적</dt>
                  <dd>{detail.recordSummary}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">소속 체육관</dt>
                  <dd>{detail.gymName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">지역</dt>
                  <dd>{detail.regionLabel}</dd>
                </div>
                {detail.gymPhone ? (
                  <div>
                    <dt className="text-muted-foreground">체육관 연락</dt>
                    <dd>{detail.gymPhone}</dd>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    체육관 연락처가 등록되지 않았습니다. 체육관에 문의해
                    주세요.
                  </p>
                )}
              </dl>
              <div className="mt-4 space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
                <p>
                  <span className="text-muted-foreground">주최자 공개 풀: </span>
                  {detail.isPublicToOrganizers ? "허용됨" : "비허용"}
                </p>
                <p>
                  <span className="text-muted-foreground">일반 공개 프로필: </span>
                  {detail.profileIsPublic ? "공개 ON" : "공개 OFF"}
                </p>
                {detail.publicProfileUrl ? (
                  <Link
                    href={detail.publicProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-block underline-offset-4 hover:underline"
                  >
                    공개 프로필 페이지 열기
                  </Link>
                ) : null}
              </div>
              {detail.recentParticipations.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold">참가 이력</h4>
                  <ul className="mt-2 space-y-2 text-xs">
                    {detail.recentParticipations.map((p, i) => (
                      <li key={i} className="rounded border px-2 py-1.5">
                        <p className="font-medium">{p.eventTitle}</p>
                        <p className="text-muted-foreground">
                          {p.divisionLabel}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">불러오는 중…</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
