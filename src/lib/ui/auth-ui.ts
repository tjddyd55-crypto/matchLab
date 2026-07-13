import {
  matchonPageDescClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";

/** 로그인·회원가입·공개 신청/서명/동의 화면 공통 SSOT */

export const authPageShellClass =
  "flex min-h-screen flex-col items-center justify-center bg-matchon-surface p-6";

export const authPageCardClass =
  "w-full max-w-md rounded-2xl border border-matchon-border bg-white p-6 shadow-sm";

export const publicAuthPageShellClass =
  "mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-8 md:py-12";

export const publicAuthPageCardClass =
  "w-full rounded-2xl border border-matchon-border bg-white p-6 shadow-sm";

export const authPageTitleClass =
  "text-xl font-semibold tracking-tight text-matchon-text-primary";

export const authPageDescClass =
  "text-sm leading-relaxed text-matchon-text-secondary";

export const publicAuthPageTitleClass = matchonPageTitleClass;

export const publicAuthPageDescClass = matchonPageDescClass;

export const authFieldInputClass = matchonFieldInputClass;
