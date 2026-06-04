/**
 * 주최자 크레딧 단위·충전 상품·참가 승인 차감 정책 (MVP).
 */

export const CREDIT_UNIT_KRW = 10;
export const DEFAULT_PARTICIPANT_FEE_KRW = 1000;
export const DEFAULT_PARTICIPANT_FEE_CREDITS = 100;

export type CreditChargePlan = {
  id: string;
  label: string;
  amountKrw: number;
  credits: number;
};

const CHARGE_PLANS: CreditChargePlan[] = [
  {
    id: "plan_100k",
    label: "100,000원",
    amountKrw: 100_000,
    credits: 10_000,
  },
  {
    id: "plan_300k",
    label: "300,000원",
    amountKrw: 300_000,
    credits: 30_000,
  },
  {
    id: "plan_500k",
    label: "500,000원",
    amountKrw: 500_000,
    credits: 50_000,
  },
];

export function krwToCredits(krw: number): number {
  if (!Number.isFinite(krw) || krw < 0) return 0;
  return Math.floor(krw / CREDIT_UNIT_KRW);
}

export function creditsToKrw(credits: number): number {
  if (!Number.isFinite(credits) || credits < 0) return 0;
  return credits * CREDIT_UNIT_KRW;
}

/** 향후 대회별 단가 — MVP는 기본 100C */
export function participantFeeCredits(_event?: {
  participantFeeCredits?: number | null;
}): number {
  void _event;
  return DEFAULT_PARTICIPANT_FEE_CREDITS;
}

export function getCreditChargePlans(): CreditChargePlan[] {
  return [...CHARGE_PLANS];
}

export function getChargePlanById(planId: string): CreditChargePlan | undefined {
  return CHARGE_PLANS.find((p) => p.id === planId);
}

export function getApproveableParticipantCount(
  balance: number,
  feeCredits: number = DEFAULT_PARTICIPANT_FEE_CREDITS,
): number {
  if (feeCredits <= 0) return 0;
  if (balance < feeCredits) return 0;
  return Math.floor(balance / feeCredits);
}
