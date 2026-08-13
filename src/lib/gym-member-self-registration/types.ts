import type { GymMemberSelfRegTimeBand } from "@/lib/gym-member-self-registration/constants";

export type HealthAnswer = {
  answer: boolean | null;
  detail: string;
};

export type HealthSnapshot = {
  currentCondition: HealthAnswer;
  medicationOrDisease: HealthAnswer;
  exerciseCaution: HealthAnswer;
  recentSurgeryOrHospital: HealthAnswer;
};

export type ConsentSnapshot = {
  privacyAgreed: true;
  privacyAgreedAt: string;
  termsAgreed: true;
  termsAgreedAt: string;
  termsVersion: number;
  termsTitle: string;
  termsContent: string;
  guardianConsentAgreed?: boolean;
};

export type FormSnapshot = {
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  occupationOrSchool?: string;
  guardianName?: string;
  guardianPhone?: string;
  preferredTimeBand?: GymMemberSelfRegTimeBand;
  purposeText?: string;
  experienceText?: string;
};

export type PublicSelfRegistrationContext = {
  ok: true;
  gymId: string;
  gymName: string;
  logoUrl: string | null;
  termsTitle: string;
  termsVersion: number;
  termsContent: string;
} | {
  ok: false;
  reason: "revoked" | "not_found";
};

export const EMPTY_HEALTH_SNAPSHOT: HealthSnapshot = {
  currentCondition: { answer: null, detail: "" },
  medicationOrDisease: { answer: null, detail: "" },
  exerciseCaution: { answer: null, detail: "" },
  recentSurgeryOrHospital: { answer: null, detail: "" },
};

export function healthSnapshotHasYes(snapshot: HealthSnapshot): boolean {
  return (
    snapshot.currentCondition.answer === true ||
    snapshot.medicationOrDisease.answer === true ||
    snapshot.exerciseCaution.answer === true ||
    snapshot.recentSurgeryOrHospital.answer === true
  );
}
