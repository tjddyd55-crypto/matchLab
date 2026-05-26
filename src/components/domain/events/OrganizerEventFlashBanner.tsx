"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "organizer:event-poster-upload-error";

function readFlashMessage(): string | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      sessionStorage.removeItem(STORAGE_KEY);
      return stored;
    }
  } catch {
    /* sessionStorage unavailable */
  }
  return null;
}

export function OrganizerEventFlashBanner() {
  const message = useSyncExternalStore(
    () => () => {},
    readFlashMessage,
    () => null,
  );

  if (!message) return null;

  return (
    <p
      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-50"
      role="alert"
    >
      {message}
    </p>
  );
}

export function stashPosterUploadFlashMessage(message: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, message);
  } catch {
    /* ignore */
  }
}
