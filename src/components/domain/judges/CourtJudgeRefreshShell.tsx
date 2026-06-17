"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 5000;

type RefreshPauseContextValue = {
  pauseRefresh: () => void;
  resumeRefresh: () => void;
};

const RefreshPauseContext = createContext<RefreshPauseContextValue | null>(null);

export function useCourtJudgeRefreshPause(): RefreshPauseContextValue {
  const ctx = useContext(RefreshPauseContext);
  if (!ctx) {
    return {
      pauseRefresh: () => {},
      resumeRefresh: () => {},
    };
  }
  return ctx;
}

function isFormControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function CourtJudgeRefreshShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const pauseCountRef = useRef(0);

  const pauseRefresh = () => {
    pauseCountRef.current += 1;
    setPaused(true);
  };

  const resumeRefresh = () => {
    pauseCountRef.current = Math.max(0, pauseCountRef.current - 1);
    if (pauseCountRef.current === 0) {
      setPaused(false);
    }
  };

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (isFormControl(event.target)) {
        pauseRefresh();
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      if (isFormControl(event.target)) {
        window.setTimeout(() => {
          const active = document.activeElement;
          if (!isFormControl(active)) {
            resumeRefresh();
          }
        }, 120);
      }
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    const onFocus = () => {
      if (!paused) router.refresh();
    };
    window.addEventListener("focus", onFocus);

    const timer = window.setInterval(() => {
      if (!paused) router.refresh();
    }, POLL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [router, paused]);

  return (
    <RefreshPauseContext.Provider value={{ pauseRefresh, resumeRefresh }}>
      {children}
    </RefreshPauseContext.Provider>
  );
}
