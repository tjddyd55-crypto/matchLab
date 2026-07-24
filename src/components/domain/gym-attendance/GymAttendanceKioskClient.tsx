"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { formatPhoneNumber, normalizePhoneDigits } from "@/lib/phone";

const RESET_MS = 4000;

type CheckInResponse = {
  success: boolean;
  status: string;
  displayMemberName?: string;
  attendanceTime?: string;
  message: string;
  needsDeskNotice?: boolean;
};

type Phase = "idle" | "success" | "error";

export function GymAttendanceKioskClient({
  token,
  gymName,
}: {
  token: string;
  gymName: string;
}) {
  const [display, setDisplay] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  function scheduleReset() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setDisplay("");
      setPhase("idle");
      setResult(null);
      inputRef.current?.focus();
    }, RESET_MS);
  }

  function submit() {
    if (pending) return;
    const phone = normalizePhoneDigits(display);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/public/gym-attendance/${encodeURIComponent(token)}/check-in`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone }),
          },
        );
        const data = (await res.json()) as CheckInResponse;
        setResult(data);
        setPhase(data.success ? "success" : "error");
        scheduleReset();
      } catch {
        setResult({
          success: false,
          status: "network",
          message:
            "네트워크 연결을 확인해 주세요.\n출석이 저장되지 않았습니다.",
        });
        setPhase("error");
        scheduleReset();
      }
    });
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // ignore — browser may deny
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col justify-center px-4 py-8">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-wide text-matchon-primary">
          MATCHON
        </p>
        <h1 className="mt-2 text-2xl font-bold text-matchon-text-primary sm:text-3xl">
          {gymName}
        </h1>
        <p className="mt-1 text-base text-matchon-text-secondary">출석 체크</p>
      </div>

      {phase === "idle" ? (
        <div className="mt-10 space-y-6">
          <label className="block">
            <span className="mb-2 block text-center text-sm text-matchon-text-secondary">
              휴대폰 번호를 입력해 주세요.
            </span>
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={display}
              disabled={pending}
              onChange={(e) => setDisplay(formatPhoneNumber(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="010-0000-0000"
              className="w-full rounded-xl border-2 border-matchon-border bg-white px-4 py-4 text-center text-2xl font-semibold tracking-wide text-matchon-text-primary outline-none focus:border-matchon-primary"
            />
          </label>
          <button
            type="button"
            disabled={pending || normalizePhoneDigits(display).length < 10}
            onClick={submit}
            className="w-full rounded-xl bg-matchon-primary py-4 text-lg font-bold text-white disabled:opacity-50"
          >
            {pending ? "처리 중…" : "출석하기"}
          </button>
        </div>
      ) : (
        <div
          className={`mt-10 rounded-xl border p-6 text-center ${
            phase === "success"
              ? "border-matchon-primary/30 bg-matchon-primary/5"
              : "border-red-200 bg-red-50"
          }`}
          role="status"
        >
          <p className="whitespace-pre-line text-lg font-semibold text-matchon-text-primary">
            {result?.message}
          </p>
          {result?.displayMemberName ? (
            <p className="mt-3 max-w-full break-keep text-center text-xl font-bold leading-snug text-matchon-text-primary [overflow-wrap:anywhere] line-clamp-2">
              {result.displayMemberName} 회원님
            </p>
          ) : null}
          {result?.attendanceTime ? (
            <p className="mt-2 text-sm text-matchon-text-secondary">
              {result.status === "already_checked_in"
                ? `첫 출석 ${result.attendanceTime}`
                : result.attendanceTime}
            </p>
          ) : null}
          {phase === "success" && !result?.needsDeskNotice ? (
            <p className="mt-3 text-sm text-matchon-text-secondary">
              오늘도 좋은 운동 되세요.
            </p>
          ) : null}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-matchon-text-secondary">
        문제가 있으면 체육관 데스크에 문의해 주세요.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => void enterFullscreen()}
          className="rounded-md border border-matchon-border px-3 py-1.5 text-xs text-matchon-text-secondary"
        >
          전체화면
        </button>
        <button
          type="button"
          onClick={() => {
            setDisplay("");
            setPhase("idle");
            setResult(null);
            inputRef.current?.focus();
          }}
          className="rounded-md border border-matchon-border px-3 py-1.5 text-xs text-matchon-text-secondary"
        >
          화면 초기화
        </button>
      </div>
    </div>
  );
}
