/**
 * 로그인 화면(일반·심판) 공통 시각 SSOT.
 * 심판 로그인 가독성을 기준으로 `/login`과 `/judge/login`에 동일 적용.
 */

import { formControlLoginInputClass } from "@/lib/ui/form-control-ui";

/** 중앙 정렬 셸 — header 없이 중앙 로고+카드만 */
export const authLoginShellClass =
  "flex min-h-screen w-full flex-col items-center justify-center bg-matchon-surface px-5 py-8 sm:px-6";

/** 카드 폭 448px (430~480 권장 구간) */
export const authLoginCardClass =
  "w-full max-w-[28rem] rounded-2xl border border-matchon-border bg-white p-6 shadow-sm sm:p-8";

export const authLoginLogoWrapClass = "mb-6 flex justify-center";

export const authLoginHeaderStackClass = "mb-6 space-y-2 text-center";

export const authLoginEyebrowClass =
  "text-[0.9375rem] font-bold leading-snug text-matchon-primary";

export const authLoginTitleClass =
  "font-heading text-[1.75rem] font-semibold tracking-tight text-matchon-text-primary sm:text-[2rem]";

export const authLoginDescClass =
  "text-base leading-relaxed text-matchon-text-secondary";

export const authLoginSecondaryNoteClass =
  "text-[0.9375rem] leading-[1.5] text-matchon-text-secondary";

export const authLoginFormClass = "flex w-full flex-col gap-4";

export const authLoginFieldStackClass = "flex flex-col gap-1.5";

export const authLoginLabelClass =
  "text-[0.9375rem] font-semibold text-matchon-text-primary";

/** 로그인 예외: 44px · font-size 16px (모바일 줌 방지) — 업무형 compact와 분리 */
export const authLoginInputClass = formControlLoginInputClass;

export const authLoginErrorClass =
  "text-sm leading-relaxed text-destructive";

export const authLoginFooterClass =
  "text-center text-[0.9375rem] leading-relaxed text-matchon-text-secondary";

export const authLoginNoticeListClass =
  "mt-6 list-disc space-y-2 pl-5 text-sm leading-[1.6] text-matchon-text-secondary";

export const AUTH_LOGIN_LOGO_SIZE = "md" as const;
