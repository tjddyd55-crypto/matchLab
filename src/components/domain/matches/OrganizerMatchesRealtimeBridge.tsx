"use client";

import { useMemo } from "react";
import { useMatchRealtime } from "@/features/realtime/useMatchRealtime";

export function OrganizerMatchesRealtimeBridge(props: {
  eventId: string;
  bracketIds: readonly string[];
  organizerId?: string | null;
}) {
  const bracketIdsSerialized = props.bracketIds.join(",");

  const bracketIds = useMemo(
    () => bracketIdsSerialized.split(",").filter(Boolean),
    [bracketIdsSerialized],
  );

  useMatchRealtime({
    eventId: props.eventId,
    bracketIds,
    organizerId: props.organizerId ?? null,
  });

  return null;
}
