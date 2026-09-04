"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  GymMemberPromoteFighterDialog,
  type PromoteSportOption,
} from "@/components/domain/gym-members/GymMemberPromoteFighterDialog";
import {
  GymMemberDetailItem,
  GymMemberFieldGrid,
  GymMemberFormSection,
} from "@/components/domain/gym-members/GymMemberFormLayout";
import { formatOfficialRecordSummary } from "@/lib/fighter-unified-profile/official-record";
import type { FighterOfficialRecord } from "@/lib/fighter-unified-profile/types";
import { cn } from "@/lib/utils";

const FIGHTER_STATUS_LABEL: Record<string, string> = {
  active: "활동",
  inactive: "휴식",
  duplicate_review: "중복 검토",
  archived: "보관",
};

export type GymMemberFighterOverviewView = {
  id: string;
  fighterCode: string;
  name: string;
  status: string;
  primarySport: string | null;
  height: number | null;
  weight: number | null;
  gymName: string;
  officialRecord: FighterOfficialRecord;
  externalRecord: FighterOfficialRecord;
  combinedRecord: FighterOfficialRecord;
};

export function GymMemberFighterOverviewSection({
  memberId,
  memberName,
  gymName,
  birthDate,
  genderLabel,
  canWrite,
  hasFighter,
  fighter,
  defaultPrimarySport,
  sportOptions,
}: {
  memberId: string;
  memberName: string;
  gymName: string;
  birthDate: Date | string | null;
  genderLabel: string | null;
  canWrite: boolean;
  hasFighter: boolean;
  fighter: GymMemberFighterOverviewView | null;
  defaultPrimarySport: string;
  sportOptions: PromoteSportOption[];
}) {
  const [open, setOpen] = useState(false);

  if (hasFighter && fighter) {
    return (
      <GymMemberFormSection title="선수 정보" badge="등록 선수">
        <GymMemberFieldGrid>
          <GymMemberDetailItem
            label="상태"
            value={FIGHTER_STATUS_LABEL[fighter.status] ?? fighter.status}
            span={3}
          />
          <GymMemberDetailItem label="선수명" value={fighter.name} span={3} />
          <GymMemberDetailItem
            label="주 종목"
            value={fighter.primarySport ?? "—"}
            span={3}
          />
          <GymMemberDetailItem
            label="소속"
            value={fighter.gymName || gymName || "—"}
            span={3}
          />
          <GymMemberDetailItem
            label="신장"
            value={
              fighter.height != null ? `${fighter.height}cm` : "—"
            }
            span={3}
          />
          <GymMemberDetailItem
            label="현재 체중"
            value={
              fighter.weight != null ? `${fighter.weight}kg` : "—"
            }
            span={3}
          />
          <GymMemberDetailItem
            label="MATCHON 공식 전적"
            value={formatOfficialRecordSummary(fighter.officialRecord)}
            span={4}
          />
          <GymMemberDetailItem
            label="외부 전적"
            value={formatOfficialRecordSummary(fighter.externalRecord)}
            span={4}
          />
          <GymMemberDetailItem
            label="통합 표시 전적"
            value={formatOfficialRecordSummary(fighter.combinedRecord)}
            span={4}
          />
        </GymMemberFieldGrid>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/gym/fighters/${fighter.id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-9",
            )}
          >
            선수 정보 수정
          </Link>
          <Link
            href={`/gym/fighters/${fighter.id}/edit#career`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-9",
            )}
          >
            커리어 보기
          </Link>
        </div>
      </GymMemberFormSection>
    );
  }

  return (
    <>
      <GymMemberFormSection title="선수 정보">
        <div className="space-y-2 py-0.5">
          <p className="text-sm text-matchon-text-primary">
            아직 선수로 등록되지 않았습니다.
          </p>
          <p className="text-xs text-matchon-text-secondary">
            선수로 등록하면 대회 참가 및 MATCHON 공식 경기 기록과 연결할 수
            있습니다.
          </p>
          {canWrite ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(buttonVariants({ size: "sm" }), "mt-1 min-h-9")}
            >
              선수로 등록
            </button>
          ) : null}
        </div>
      </GymMemberFormSection>

      {canWrite ? (
        <GymMemberPromoteFighterDialog
          open={open}
          onOpenChange={setOpen}
          memberId={memberId}
          memberName={memberName}
          gymName={gymName}
          birthDate={birthDate}
          genderLabel={genderLabel}
          defaultPrimarySport={defaultPrimarySport}
          sportOptions={sportOptions}
        />
      ) : null}
    </>
  );
}
