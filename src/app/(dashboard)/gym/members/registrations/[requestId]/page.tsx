import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { gymMemberSelfRegistrationService } from "@/lib/services/gym-member-self-registration.service";
import { formatPhoneNumber } from "@/lib/phone";
import { formatUtcDateOnly } from "@/lib/date-only";
import { GymMemberSelfRegistrationReviewActions } from "@/components/domain/gym-member-self-registration/GymMemberSelfRegistrationReviewActions";
import { MemberPageHeader } from "@/components/domain/gym-members/MemberPageHeader";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HealthSnapshot } from "@/lib/gym-member-self-registration/types";
import { GYM_MEMBER_SELF_REG_GENDER_LABELS } from "@/lib/gym-member-self-registration/constants";
import { formatCompletedAgeLabel } from "@/lib/gym-member-self-registration/age";

export const dynamic = "force-dynamic";

export default async function GymMemberRegistrationDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const actor = await requireActor();
  if (!actor.gymId) notFound();
  const { requestId } = await params;
  const row = await gymMemberSelfRegistrationService.getRequestDetail(
    actor,
    requestId,
  );
  const health = row.healthSnapshot as HealthSnapshot;
  const genderLabel =
    row.gender === "남" || row.gender === "여"
      ? GYM_MEMBER_SELF_REG_GENDER_LABELS[row.gender]
      : row.gender ?? "-";

  return (
    <div className={cn(matchonPageContainerClass, "bg-matchon-surface")}>
      <div className={matchonPageStackClass}>
        <MemberPageHeader
          title={`${row.name} 등록 신청서`}
          description="종이 신청서처럼 한 화면에서 확인합니다."
          actions={
            <Link
              href="/gym/members/registrations"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
            >
              목록
            </Link>
          }
        />

        {row.duplicates.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            이미 등록된 회원이 있습니다. 승인 전 확인해 주세요.
            <ul className="mt-2 list-disc pl-5">
              {row.duplicates.slice(0, 5).map((d) => (
                <li key={d.id}>
                  {d.name} · {formatPhoneNumber(d.phone) || d.phone}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Section title="기본정보">
          <Info label="이름" value={row.name} />
          <Info label="성별" value={genderLabel} />
          <Info
            label="생년월일"
            value={`${formatUtcDateOnly(row.birthDate)} (${formatCompletedAgeLabel(row.birthDate)})`}
          />
          <Info label="연락처" value={formatPhoneNumber(row.phone) || row.phone} />
          <Info label="주소" value={[row.address, row.addressDetail].filter(Boolean).join(" ") || "-"} />
          <Info label="직업/학교" value={row.occupationOrSchool || "-"} />
          <Info label="희망 시간대" value={row.preferredTimeBand || "-"} />
          <Info label="운동 목적" value={row.purposeText || "-"} />
        </Section>

        <Section title="건강상태">
          {row.healthHasAnyYes ? (
            <p className="mb-2 text-xs font-semibold text-amber-800">
              건강정보 확인 필요
            </p>
          ) : null}
          <HealthRow label="현재 건강상 이상" row={health.currentCondition} />
          <HealthRow label="복용약/질환" row={health.medicationOrDisease} />
          <HealthRow label="운동 시 주의사항" row={health.exerciseCaution} />
          <HealthRow label="최근 수술/입원" row={health.recentSurgeryOrHospital} />
        </Section>

        <Section title="운동경력">
          <p className="whitespace-pre-wrap text-sm">
            {row.experienceText || "-"}
          </p>
        </Section>

        <Section title="동의내역">
          <Info label="개인정보 동의" value={row.privacyAgreedAt.toISOString()} />
          <Info
            label="이용안내"
            value={`${row.termsTitle} v${row.termsVersion}`}
          />
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-matchon-text-secondary">
            {row.termsContent}
          </pre>
        </Section>

        <Section title="서명">
          {row.memberSignatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.memberSignatureUrl}
              alt="회원 서명"
              className="h-28 w-full max-w-sm rounded-lg border border-matchon-border bg-white object-contain"
            />
          ) : (
            <p className="text-sm text-matchon-text-secondary">서명 없음</p>
          )}
          {row.guardianName ? (
            <div className="mt-4 space-y-2">
              <Info label="보호자" value={`${row.guardianName} · ${row.guardianPhone ?? ""}`} />
              {row.guardianSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.guardianSignatureUrl}
                  alt="보호자 서명"
                  className="h-28 w-full max-w-sm rounded-lg border border-matchon-border bg-white object-contain"
                />
              ) : null}
            </div>
          ) : null}
        </Section>

        <GymMemberSelfRegistrationReviewActions
          requestId={row.id}
          status={row.status}
          hasDuplicate={row.duplicates.length > 0}
          approvedMemberId={row.approvedGymMemberId}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-matchon-border bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-matchon-border py-1.5 text-sm last:border-0">
      <span className="text-matchon-text-secondary">{label}</span>
      <span className="max-w-[70%] text-right break-words">{value}</span>
    </div>
  );
}

function HealthRow({
  label,
  row,
}: {
  label: string;
  row: { answer: boolean | null; detail: string };
}) {
  return (
    <div className="border-b border-matchon-border py-2 text-sm last:border-0">
      <div className="flex justify-between">
        <span>{label}</span>
        <span>{row.answer === true ? "예" : row.answer === false ? "아니오" : "-"}</span>
      </div>
      {row.answer === true && row.detail ? (
        <p className="mt-1 whitespace-pre-wrap text-xs text-matchon-text-secondary">
          {row.detail}
        </p>
      ) : null}
    </div>
  );
}
