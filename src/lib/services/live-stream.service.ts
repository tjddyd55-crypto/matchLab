import "server-only";

import type { ActorContext } from "@/lib/auth/actor-context";
import type { PublicLiveStreamDTO } from "@/lib/dto/public";
import { StreamType } from "@/lib/enums";
import { requireOrganizerForEvent } from "@/lib/permissions";
import { liveStreamRepository } from "@/lib/repositories/live-stream.repository";

type OrganizerLiveStreamRow = Awaited<
  ReturnType<typeof liveStreamRepository.listLiveStreamsByEventId>
>[number];

export type OrganizerLiveStreamVM = {
  id: string;
  title: string;
  platform: OrganizerLiveStreamRow["platform"];
  streamType: OrganizerLiveStreamRow["streamType"];
  matNumber: number | null;
  watchUrl: string | null;
  embedUrl: string | null;
  status: OrganizerLiveStreamRow["status"];
  isPublic: boolean;
};

/** MVP: watchUrl/embedUrl 만 — 스트림 키·OAuth 금지. */
export const liveStreamService = {
  async listPublicForEventSlug(slug: string): Promise<PublicLiveStreamDTO[]> {
    const rows = await liveStreamRepository.listPublicLiveStreamsByEventSlug(slug);
    const out: PublicLiveStreamDTO[] = [];
    for (const r of rows) {
      if (!r.watchUrl) continue;
      out.push({
        id: r.id,
        title: r.title,
        platform: r.platform,
        streamType: r.streamType === StreamType.mat ? "mat" : "main",
        matNumber: r.matNumber,
        watchUrl: r.watchUrl,
        embedUrl: r.embedUrl,
        status: r.status,
        isPublic: r.isPublic,
      });
    }
    return out;
  },

  async listForOrganizerEvent(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerLiveStreamVM[]> {
    await requireOrganizerForEvent(actor, eventId);
    const rows = await liveStreamRepository.listLiveStreamsByEventId(eventId);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      platform: r.platform,
      streamType: r.streamType,
      matNumber: r.matNumber,
      watchUrl: r.watchUrl,
      embedUrl: r.embedUrl,
      status: r.status,
      isPublic: r.isPublic,
    }));
  },

  async upsertStreams(_actor: ActorContext, _eventId: string): Promise<void> {
    void _actor;
    void _eventId;
    throw new Error("TODO: liveStreamService.upsertStreams");
  },
};
