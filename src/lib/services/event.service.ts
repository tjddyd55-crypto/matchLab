import "server-only";

import { randomBytes } from "node:crypto";

import type { ActorContext } from "@/lib/auth/actor-context";
import type {
  PublicEventDetailDTO,
  PublicEventDivisionDTO,
  PublicEventGalleryImageDTO,
  PublicEventListItemDTO,
} from "@/lib/dto/public";
import type { Prisma } from "@/generated/prisma";
import { AuditAction, EventStatus } from "@/generated/prisma";
import {
  evaluateGymEventApplyEligibility,
  gymListingBadgeLabel,
} from "@/lib/gym-event-apply";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import {
  type PublicEventDetailRecord,
  type PublicEventDivisionRecord,
  type PublicEventListRecord,
  eventRepository,
} from "@/lib/repositories/event.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { allocateUniquePublicSlug } from "@/lib/event-public-slug";
import {
  buildPublicPaymentDisplayLines,
  formatPublicFeeAmount,
  primarySportFromDivisions,
  resolveEventCoverImageUrl,
  resolvePublicRegistrationStatus,
} from "@/lib/event-public-display";
import { AppError } from "@/lib/errors/app-error";
import { requireOrganizerForEvent, requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type {
  ChangeEventStatusInput,
  CreateEventDivisionInput,
  CreateEventInput,
  DeleteEventDivisionInput,
  UpdateEventDivisionInput,
  UpdateEventInput,
  UpdateSpectatorAccessInput,
  UpsertEventPaymentSettingInput,
} from "@/lib/validators/event.validator";

function toIso(d: Date): string {
  return d.toISOString();
}

function mapGalleryRows(
  rows: PublicEventDetailRecord["images"],
): PublicEventGalleryImageDTO[] {
  return rows.map((im) => ({
    id: im.id,
    imageUrl: im.imageUrl,
    caption: im.caption,
    sortOrder: im.sortOrder,
  }));
}

export function composeEventVenueDisplay(row: {
  locationName?: string | null;
  roadAddress?: string | null;
  location?: string | null;
  detailAddress?: string | null;
}): string {
  const name = row.locationName?.trim();
  const road = row.roadAddress?.trim() || row.location?.trim();
  const detail = row.detailAddress?.trim();
  const main = [road, detail].filter(Boolean).join(", ");
  if (name && main) return `${name} — ${main}`;
  return name || main || "";
}

function buildDivisionSummary(
  preview: PublicEventListRecord["divisions"],
  total: number,
): string {
  if (total === 0) return "등록된 부문 없음";
  const maxLabels = Math.min(3, total);
  const labels = preview
    .slice(0, maxLabels)
    .map((d) =>
      [d.sportType, d.weightClass ?? d.ageGroup].filter(Boolean).join(" · "),
    )
    .filter(Boolean);
  const head = labels.join(" · ");
  const rest = total - labels.length;
  if (rest > 0) {
    return head ? `${head} 외 ${rest}개 부문` : `${total}개 부문`;
  }
  return head || `${total}개 부문`;
}

function mapDivisionRecordToDto(
  row: PublicEventDivisionRecord,
): PublicEventDivisionDTO {
  return {
    id: row.id,
    sportType: row.sportType,
    ruleType: row.ruleType,
    gender: row.gender,
    ageGroup: row.ageGroup,
    weightClass: row.weightClass,
    skillLevel: row.skillLevel,
  };
}

function assertEventStatusTransition(
  current: EventStatus,
  next: EventStatus,
): void {
  const allowed: Record<EventStatus, EventStatus[]> = {
    [EventStatus.draft]: [EventStatus.open, EventStatus.cancelled],
    [EventStatus.open]: [EventStatus.closed, EventStatus.cancelled],
    [EventStatus.closed]: [EventStatus.bracket_ready, EventStatus.cancelled],
    [EventStatus.bracket_ready]: [EventStatus.ongoing, EventStatus.cancelled],
    [EventStatus.ongoing]: [EventStatus.finished, EventStatus.cancelled],
    [EventStatus.finished]: [],
    [EventStatus.cancelled]: [],
  };
  if (!allowed[current]?.includes(next)) {
    throw new AppError(
      "CONFLICT",
      "허용되지 않는 대회 상태 전이입니다.",
    );
  }
}

async function assertReadyForPublicOpen(eventId: string): Promise<void> {
  const full = await eventRepository.findOrganizerEventById(eventId);
  if (!full) throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");

  if (!full.title?.trim()) {
    throw new AppError("VALIDATION_ERROR", "대회명이 필요합니다.");
  }
  const venue = composeEventVenueDisplay(full).trim();
  if (!venue) {
    throw new AppError(
      "VALIDATION_ERROR",
      "공개 전에 주소 검색으로 도로명 주소를 선택하고, 필요하면 상세 주소를 입력해 주세요.",
    );
  }
  if (full.divisions.length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "공개 전에 최소 1개 부문이 필요합니다.",
    );
  }
  if (!full.paymentSetting) {
    throw new AppError(
      "VALIDATION_ERROR",
      "공개 전에 참가비·입금 계좌 설정이 필요합니다.",
    );
  }
  if (full.registrationStartDate > full.registrationEndDate) {
    throw new AppError("VALIDATION_ERROR", "신청 기간이 올바르지 않습니다.");
  }
  if (full.registrationEndDate > full.eventDate) {
    throw new AppError(
      "VALIDATION_ERROR",
      "신청 마감일은 대회 일정 이전(또는 당일)이어야 합니다.",
    );
  }
}

function resolveOrganizerIdForCreate(
  actor: ActorContext,
  inputOrganizerId?: string,
): string {
  if (actor.role === "admin") {
    const oid = inputOrganizerId?.trim();
    if (!oid) {
      throw new AppError(
        "VALIDATION_ERROR",
        "관리자는 주최자(organizerId)를 지정해야 합니다.",
      );
    }
    return oid;
  }
  requireRole(actor, ["organizer"]);
  if (!actor.organizerId) {
    throw new AppError("FORBIDDEN", "주최자 정보가 없습니다.");
  }
  return actor.organizerId;
}

export type OrganizerEventListItemVM = {
  id: string;
  organizerId: string;
  organizerName?: string;
  publicSlug: string;
  title: string;
  location: string | null;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: EventStatus;
  applicationCount: number;
};

export type OrganizerEventPaymentSettingVM = {
  feeAmount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  depositorRule: string | null;
  paymentDueDate: string | null;
};

export type OrganizerEventDivisionVM = {
  id: string;
  sportType: string;
  ruleType: string | null;
  gender: string | null;
  ageGroup: string | null;
  weightClass: string | null;
  skillLevel: string | null;
};

export type OrganizerEventDetailVM = {
  id: string;
  organizerId: string;
  organizerName: string;
  publicSlug: string;
  title: string;
  description: string | null;
  location: string | null;
  roadAddress: string | null;
  jibunAddress: string | null;
  detailAddress: string | null;
  postalCode: string | null;
  locationName: string | null;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: EventStatus;
  posterUrl: string | null;
  spectatorAccessEnabled: boolean;
  spectatorAccessStartAt: string | null;
  spectatorAccessEndAt: string | null;
  spectatorAccessToken: string | null;
  photoRecordingEnabled: boolean;
  videoRecordingEnabled: boolean;
  liveStreamingEnabled: boolean;
  streamingNoticeText: string | null;
  streamingConsentRequired: boolean;
  applicationCount: number;
  divisions: OrganizerEventDivisionVM[];
  paymentSetting: OrganizerEventPaymentSettingVM | null;
  galleryImages: { id: string; imageUrl: string; caption: string | null; sortOrder: number }[];
};

function mapOrganizerEventDetail(
  row: NonNullable<Awaited<ReturnType<typeof eventRepository.findOrganizerEventById>>>,
): OrganizerEventDetailVM {
  const payment = row.paymentSetting;
  return {
    id: row.id,
    organizerId: row.organizerId,
    organizerName: row.organizer.name,
    publicSlug: row.publicSlug,
    title: row.title,
    description: row.description,
    location: row.location,
    roadAddress: row.roadAddress ?? null,
    jibunAddress: row.jibunAddress ?? null,
    detailAddress: row.detailAddress ?? null,
    postalCode: row.postalCode ?? null,
    locationName: row.locationName ?? null,
    eventDate: toIso(row.eventDate),
    registrationStartDate: toIso(row.registrationStartDate),
    registrationEndDate: toIso(row.registrationEndDate),
    status: row.status,
    posterUrl: row.posterUrl,
    spectatorAccessEnabled: row.spectatorAccessEnabled,
    spectatorAccessStartAt: row.spectatorAccessStartAt
      ? toIso(row.spectatorAccessStartAt)
      : null,
    spectatorAccessEndAt: row.spectatorAccessEndAt
      ? toIso(row.spectatorAccessEndAt)
      : null,
    spectatorAccessToken: row.spectatorAccessToken ?? null,
    photoRecordingEnabled: row.photoRecordingEnabled,
    videoRecordingEnabled: row.videoRecordingEnabled,
    liveStreamingEnabled: row.liveStreamingEnabled,
    streamingNoticeText: row.streamingNoticeText,
    streamingConsentRequired: row.streamingConsentRequired,
    applicationCount: row._count.applications,
    divisions: row.divisions.map((d) => ({
      id: d.id,
      sportType: d.sportType,
      ruleType: d.ruleType,
      gender: d.gender,
      ageGroup: d.ageGroup,
      weightClass: d.weightClass,
      skillLevel: d.skillLevel,
    })),
    paymentSetting: payment
      ? {
          feeAmount: payment.feeAmount,
          bankName: payment.bankName,
          accountNumber: payment.accountNumber,
          accountHolder: payment.accountHolder,
          depositorRule: payment.depositorRule,
          paymentDueDate: payment.paymentDueDate
            ? toIso(payment.paymentDueDate)
            : null,
        }
      : null,
    galleryImages: row.images.map((im) => ({
      id: im.id,
      imageUrl: im.imageUrl,
      caption: im.caption,
      sortOrder: im.sortOrder,
    })),
  };
}

export type GymDashboardEventItemDTO = {
  id: string;
  title: string;
  publicSlug: string;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: EventStatus;
  statusLabel: string;
  listingBadgeLabel: string;
  liveStreamingEnabled: boolean;
  streamingConsentRequired: boolean;
  organizerName: string;
  divisionCount: number;
  hasPaymentSetting: boolean;
  canApply: boolean;
  applyDisabledReason?: string;
  registrationStatusLabel: string;
};

const EVENT_STATUS_LABEL_KO: Record<EventStatus, string> = {
  draft: "작성 중",
  open: "모집 중",
  closed: "신청 마감",
  bracket_ready: "대진 준비",
  ongoing: "진행 중",
  finished: "종료",
  cancelled: "취소",
};

export const eventService = {
  async healthPing(): Promise<void> {
    await eventRepository.ping();
  },

  /** 주최자 대진표 등 내부 UI — 부문 선택 목록 */
  async listOrganizerEventDivisions(
    actor: ActorContext,
    eventId: string,
  ): Promise<PublicEventDivisionDTO[]> {
    await requireOrganizerForEvent(actor, eventId);
    const rows = await eventRepository.findPublicEventDivisions(eventId);
    return rows.map(mapDivisionRecordToDto);
  },

  async listPublicEvents(): Promise<PublicEventListItemDTO[]> {
    const rows = await eventRepository.listPublicEvents();
    const eventIds = rows.map((row) => row.id);
    const [bracketIds, resultIds] = await Promise.all([
      eventRepository.findEventIdsWithPublicBrackets(eventIds),
      eventRepository.findEventIdsWithPublicResults(eventIds),
    ]);
    return rows.map((row) =>
      eventService.mapEventToPublicListItemDTO(row, {
        hasPublicBrackets: bracketIds.has(row.id),
        hasPublicResults: resultIds.has(row.id),
      }),
    );
  },

  mapEventToPublicListItemDTO(
    row: PublicEventListRecord,
    visibility?: { hasPublicBrackets: boolean; hasPublicResults: boolean },
  ): PublicEventListItemDTO {
    const totalDivisions = row._count.divisions;
    const registrationStartDate = toIso(row.registrationStartDate);
    const registrationEndDate = toIso(row.registrationEndDate);
    return {
      id: row.id,
      publicSlug: row.publicSlug,
      title: row.title,
      location: row.location,
      eventDate: toIso(row.eventDate),
      registrationStartDate,
      registrationEndDate,
      status: row.status,
      posterUrl: row.posterUrl,
      coverImageUrl: resolveEventCoverImageUrl({
        posterUrl: row.posterUrl,
        galleryImageUrl: row.images[0]?.imageUrl ?? null,
      }),
      registrationStatus: resolvePublicRegistrationStatus({
        status: row.status,
        registrationStartDate,
        registrationEndDate,
      }),
      primarySport: primarySportFromDivisions(row.divisions),
      liveStreamingEnabled: row.liveStreamingEnabled,
      divisionSummary: buildDivisionSummary(row.divisions, totalDivisions),
      organizerName: row.organizer.name,
      hasPublicBrackets: visibility?.hasPublicBrackets ?? false,
      hasPublicResults: visibility?.hasPublicResults ?? false,
    };
  },

  /**
   * 공개 상세 — 없거나 비공개 상태면 `null` (페이지에서 `notFound()` 등 처리).
   */
  async getPublicEventBySlug(slug: string): Promise<PublicEventDetailDTO | null> {
    const event = await eventRepository.findPublicEventBySlug(slug);
    if (!event) return null;

    const [divisions, payment, bracketIds, resultIds] = await Promise.all([
      eventRepository.findPublicEventDivisions(event.id),
      eventRepository.findPublicEventPaymentSummary(event.id),
      eventRepository.findEventIdsWithPublicBrackets([event.id]),
      eventRepository.findEventIdsWithPublicResults([event.id]),
    ]);

    return eventService.mapEventToPublicDetailDTO(event, divisions, {
      payment,
      hasPublicBrackets: bracketIds.has(event.id),
      hasPublicResults: resultIds.has(event.id),
    });
  },

  mapEventToPublicDetailDTO(
    event: PublicEventDetailRecord,
    divisions: PublicEventDivisionRecord[],
    extras?: {
      payment: Awaited<
        ReturnType<typeof eventRepository.findPublicEventPaymentSummary>
      >;
      hasPublicBrackets: boolean;
      hasPublicResults: boolean;
    },
  ): PublicEventDetailDTO {
    const paymentInfo = extras?.payment
      ? {
          feeAmount: extras.payment.feeAmount,
          feeLabel: formatPublicFeeAmount(extras.payment.feeAmount),
          bankName: extras.payment.bankName,
          accountHolder: extras.payment.accountHolder,
          depositorRule: extras.payment.depositorRule,
          noticeLines: buildPublicPaymentDisplayLines(extras.payment),
        }
      : null;

    const participantFeeNotice = paymentInfo
      ? paymentInfo.noticeLines.join(" ")
      : "참가비 및 납부 방식은 소속 체육관을 통해 안내됩니다.";

    const registrationStartDate = toIso(event.registrationStartDate);
    const registrationEndDate = toIso(event.registrationEndDate);
    const galleryImages = mapGalleryRows(event.images);

    return {
      id: event.id,
      publicSlug: event.publicSlug,
      title: event.title,
      description: event.description,
      location:
        composeEventVenueDisplay({
          locationName: event.locationName,
          roadAddress: event.roadAddress,
          location: event.location,
          detailAddress: event.detailAddress,
        }) || event.location,
      locationName: event.locationName ?? null,
      roadAddress: event.roadAddress ?? null,
      jibunAddress: event.jibunAddress ?? null,
      detailAddress: event.detailAddress ?? null,
      eventDate: toIso(event.eventDate),
      registrationStartDate,
      registrationEndDate,
      status: event.status,
      posterUrl: event.posterUrl,
      coverImageUrl: resolveEventCoverImageUrl({
        posterUrl: event.posterUrl,
        galleryImageUrl: galleryImages[0]?.imageUrl ?? null,
      }),
      registrationStatus: resolvePublicRegistrationStatus({
        status: event.status,
        registrationStartDate,
        registrationEndDate,
      }),
      primarySport: primarySportFromDivisions(divisions),
      galleryImages,
      photoRecordingEnabled: event.photoRecordingEnabled,
      videoRecordingEnabled: event.videoRecordingEnabled,
      liveStreamingEnabled: event.liveStreamingEnabled,
      streamingNoticeText: event.streamingNoticeText,
      streamingConsentRequired: event.streamingConsentRequired,
      organizerName: event.organizer.name,
      divisions: divisions.map(mapDivisionRecordToDto),
      participantFeeNotice,
      paymentInfo,
      hasPublicBrackets: extras?.hasPublicBrackets ?? false,
      hasPublicResults: extras?.hasPublicResults ?? false,
      publicUnmatchedListEnabled: event.publicUnmatchedListEnabled ?? false,
    };
  },

  async setPublicUnmatchedListEnabled(
    actor: ActorContext,
    eventId: string,
    enabled: boolean,
  ): Promise<void> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    await eventRepository.updateEvent(eventId, {
      publicUnmatchedListEnabled: enabled,
    });
  },

  async getEventBracketPublicationSettings(
    actor: ActorContext,
    eventId: string,
  ): Promise<{
    publicSlug: string;
    publicUnmatchedListEnabled: boolean;
  }> {
    requireRole(actor, ["organizer", "admin"]);
    await requireOrganizerForEvent(actor, eventId);
    const row = await eventRepository.findEventPublicationSettings(eventId);
    if (!row) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    return row;
  },

  async listEventsForGymDashboard(
    actor: ActorContext,
  ): Promise<GymDashboardEventItemDTO[]> {
    const rows = await eventRepository.listEventsForGymDashboard();
    const gymId = actor.gymId;
    const activeFighterCount = gymId
      ? (await fighterRepository.listActiveFightersForEventApplication(gymId))
          .length
      : 0;

    return rows.map((row) => {
      const divisionCount = row._count.divisions;
      const hasPaymentSetting = row.paymentSetting != null;
      const apply = evaluateGymEventApplyEligibility({
        status: row.status,
        registrationStartDate: row.registrationStartDate,
        registrationEndDate: row.registrationEndDate,
        divisionCount,
        hasPaymentSetting,
        activeFighterCount,
      });

      const listingBadgeLabel = gymListingBadgeLabel({
        status: row.status,
        registrationStartDate: row.registrationStartDate,
        registrationEndDate: row.registrationEndDate,
      });

      return {
        id: row.id,
        title: row.title,
        publicSlug: row.publicSlug,
        eventDate: toIso(row.eventDate),
        registrationStartDate: toIso(row.registrationStartDate),
        registrationEndDate: toIso(row.registrationEndDate),
        status: row.status,
        statusLabel: EVENT_STATUS_LABEL_KO[row.status],
        listingBadgeLabel,
        liveStreamingEnabled: row.liveStreamingEnabled,
        streamingConsentRequired: row.streamingConsentRequired,
        organizerName: row.organizer.name,
        divisionCount,
        hasPaymentSetting,
        canApply: apply.canApply,
        applyDisabledReason: apply.applyDisabledReason,
        registrationStatusLabel: apply.registrationStatusLabel,
      };
    });
  },

  async listOrganizerEvents(
    actor: ActorContext,
  ): Promise<OrganizerEventListItemVM[]> {
    requireRole(actor, ["organizer", "admin"]);
    if (actor.role === "admin") {
      const rows = await eventRepository.listAllEventsForAdmin();
      return rows.map((r) => ({
        id: r.id,
        organizerId: r.organizerId,
        organizerName: r.organizer.name,
        publicSlug: r.publicSlug,
        title: r.title,
        location: r.location,
        eventDate: toIso(r.eventDate),
        registrationStartDate: toIso(r.registrationStartDate),
        registrationEndDate: toIso(r.registrationEndDate),
        status: r.status,
        applicationCount: r._count.applications,
      }));
    }
    if (!actor.organizerId) {
      throw new AppError("FORBIDDEN", "주최자 정보가 없습니다.");
    }
    const organizerId = actor.organizerId;
    const rows = await eventRepository.listOrganizerEvents(organizerId);
    return rows.map((r) => ({
      id: r.id,
      organizerId,
      publicSlug: r.publicSlug,
      title: r.title,
      location: r.location,
      eventDate: toIso(r.eventDate),
      registrationStartDate: toIso(r.registrationStartDate),
      registrationEndDate: toIso(r.registrationEndDate),
      status: r.status,
      applicationCount: r._count.applications,
    }));
  },

  async getOrganizerEventDetail(
    actor: ActorContext,
    eventId: string,
  ): Promise<OrganizerEventDetailVM> {
    await requireOrganizerForEvent(actor, eventId);
    const row = await eventRepository.findOrganizerEventById(eventId);
    if (!row) {
      throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");
    }
    return mapOrganizerEventDetail(row);
  },

  async createOrganizerEvent(
    actor: ActorContext,
    input: CreateEventInput,
  ): Promise<{ id: string }> {
    requireRole(actor, ["organizer", "admin"]);
    const organizerId = resolveOrganizerIdForCreate(actor, input.organizerId);

    const publicSlug = await allocateUniquePublicSlug(input.title, (slug) =>
      eventRepository.isPublicSlugTaken(slug),
    );

    const posterUrl = input.posterUrl?.trim() || null;
    const liveOn = input.liveStreamingEnabled;
    const streamingConsentRequired = liveOn
      ? (input.streamingConsentRequired ?? true)
      : false;
    const streamingNoticeText = liveOn
      ? (input.streamingNoticeText?.trim() || null)
      : null;

    const composedLocation =
      composeEventVenueDisplay({
        locationName: input.locationName ?? null,
        roadAddress: input.roadAddress ?? null,
        detailAddress: input.detailAddress ?? null,
        location: input.location ?? null,
      }).trim() || null;

    const event = await eventRepository.createEvent({
      organizer: { connect: { id: organizerId } },
      title: input.title.trim(),
      description: input.description?.trim() || null,
      location: composedLocation,
      roadAddress: input.roadAddress ?? null,
      jibunAddress: input.jibunAddress ?? null,
      detailAddress: input.detailAddress ?? null,
      postalCode: input.postalCode ?? null,
      locationName: input.locationName ?? null,
      eventDate: input.eventDate,
      registrationStartDate: input.registrationStartDate,
      registrationEndDate: input.registrationEndDate,
      status: EventStatus.draft,
      publicSlug,
      posterUrl,
      photoRecordingEnabled: input.photoRecordingEnabled,
      videoRecordingEnabled: input.videoRecordingEnabled,
      liveStreamingEnabled: liveOn,
      streamingNoticeText,
      streamingConsentRequired,
    });

    return { id: event.id };
  },

  async updateOrganizerEvent(
    actor: ActorContext,
    input: UpdateEventInput,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, input.eventId);
    const current = await eventRepository.findOrganizerEventById(input.eventId);
    if (!current) throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) {
      patch.description = input.description?.trim() || null;
    }
    if (input.location !== undefined) {
      patch.location = input.location?.trim() || null;
    }
    if (input.roadAddress !== undefined) patch.roadAddress = input.roadAddress;
    if (input.jibunAddress !== undefined) patch.jibunAddress = input.jibunAddress;
    if (input.detailAddress !== undefined) patch.detailAddress = input.detailAddress;
    if (input.postalCode !== undefined) patch.postalCode = input.postalCode;
    if (input.locationName !== undefined) patch.locationName = input.locationName;
    if (input.eventDate !== undefined) patch.eventDate = input.eventDate;
    if (input.registrationStartDate !== undefined) {
      patch.registrationStartDate = input.registrationStartDate;
    }
    if (input.registrationEndDate !== undefined) {
      patch.registrationEndDate = input.registrationEndDate;
    }
    if (input.posterUrl !== undefined) {
      patch.posterUrl = input.posterUrl?.trim() || null;
    }
    if (input.photoRecordingEnabled !== undefined) {
      patch.photoRecordingEnabled = input.photoRecordingEnabled;
    }
    if (input.videoRecordingEnabled !== undefined) {
      patch.videoRecordingEnabled = input.videoRecordingEnabled;
    }

    let live = current.liveStreamingEnabled;
    if (input.liveStreamingEnabled !== undefined) {
      live = input.liveStreamingEnabled;
      patch.liveStreamingEnabled = live;
    }
    if (input.streamingNoticeText !== undefined) {
      patch.streamingNoticeText = input.streamingNoticeText?.trim() || null;
    }
    if (input.streamingConsentRequired !== undefined) {
      patch.streamingConsentRequired = input.streamingConsentRequired;
    }
    if (input.liveStreamingEnabled !== undefined) {
      if (!live) {
        patch.streamingConsentRequired = false;
        patch.streamingNoticeText = null;
      } else if (input.streamingConsentRequired === undefined) {
        patch.streamingConsentRequired = true;
      }
    }

    if (
      input.location !== undefined ||
      input.roadAddress !== undefined ||
      input.jibunAddress !== undefined ||
      input.detailAddress !== undefined ||
      input.postalCode !== undefined ||
      input.locationName !== undefined
    ) {
      const merged = {
        locationName:
          input.locationName !== undefined
            ? input.locationName
            : current.locationName,
        roadAddress:
          input.roadAddress !== undefined
            ? input.roadAddress
            : current.roadAddress,
        detailAddress:
          input.detailAddress !== undefined
            ? input.detailAddress
            : current.detailAddress,
        location:
          input.location !== undefined ? input.location : current.location,
      };
      patch.location =
        composeEventVenueDisplay({
          locationName: merged.locationName,
          roadAddress: merged.roadAddress,
          detailAddress: merged.detailAddress,
          location: merged.location,
        }).trim() || null;
    }

    if (Object.keys(patch).length === 0) return;

    const rs = (patch.registrationStartDate as Date | undefined) ??
      current.registrationStartDate;
    const re = (patch.registrationEndDate as Date | undefined) ??
      current.registrationEndDate;
    const ed = (patch.eventDate as Date | undefined) ?? current.eventDate;
    if (rs > re) {
      throw new AppError("VALIDATION_ERROR", "신청 기간이 올바르지 않습니다.");
    }
    if (re > ed) {
      throw new AppError(
        "VALIDATION_ERROR",
        "신청 마감일은 대회 일정 이전(또는 당일)이어야 합니다.",
      );
    }

    await eventRepository.updateEvent(input.eventId, patch);
  },

  async updateSpectatorAccess(
    actor: ActorContext,
    input: UpdateSpectatorAccessInput,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, input.eventId);
    const cur = await eventRepository.findOrganizerEventById(input.eventId);
    if (!cur) throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");

    let token = cur.spectatorAccessToken;
    if (input.spectatorAccessEnabled) {
      if (!token) {
        token = randomBytes(18).toString("hex");
      }
      await eventRepository.updateEvent(input.eventId, {
        spectatorAccessEnabled: true,
        spectatorAccessStartAt: input.spectatorAccessStartAt ?? null,
        spectatorAccessEndAt: input.spectatorAccessEndAt ?? null,
        spectatorAccessToken: token,
      });
    } else {
      await eventRepository.updateEvent(input.eventId, {
        spectatorAccessEnabled: false,
        spectatorAccessStartAt: null,
        spectatorAccessEndAt: null,
        spectatorAccessToken: null,
      });
    }
  },

  async changeEventStatus(
    actor: ActorContext,
    input: ChangeEventStatusInput,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, input.eventId);
    const row = await eventRepository.findOrganizerEventById(input.eventId);
    if (!row) throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");

    if (row.status === input.status) return;

    assertEventStatusTransition(row.status, input.status);

    if (row.status === EventStatus.draft && input.status === EventStatus.open) {
      await assertReadyForPublicOpen(input.eventId);
    }

    await prisma.$transaction(async (tx) => {
      await eventRepository.updateEventStatus(input.eventId, input.status, tx);
      await auditRepository.createAuditLog(
        {
          actorUserId: actor.userId,
          action: AuditAction.event_status_changed,
          targetType: "Event",
          targetId: input.eventId,
          beforeData: { status: row.status },
          afterData: { status: input.status },
        },
        tx,
      );
    });
  },

  async createEventDivision(
    actor: ActorContext,
    input: CreateEventDivisionInput,
  ): Promise<{ divisionId: string }> {
    await requireOrganizerForEvent(actor, input.eventId);
    const div = await eventRepository.createEventDivision({
      event: { connect: { id: input.eventId } },
      sportType: input.sportType.trim(),
      ruleType: input.ruleType?.trim() || null,
      gender: input.gender?.trim() || null,
      ageGroup: input.ageGroup?.trim() || null,
      weightClass: input.weightClass?.trim() || null,
      skillLevel: input.skillLevel?.trim() || null,
    });
    return { divisionId: div.id };
  },

  async updateEventDivision(
    actor: ActorContext,
    input: UpdateEventDivisionInput,
  ): Promise<void> {
    const eventId = await eventRepository.findDivisionEventId(input.divisionId);
    if (!eventId) {
      throw new AppError("NOT_FOUND", "부문을 찾을 수 없습니다.");
    }
    await requireOrganizerForEvent(actor, eventId);

    const data: Prisma.EventDivisionUpdateInput = {};
    if (input.sportType !== undefined) {
      data.sportType = input.sportType.trim();
    }
    if (input.ruleType !== undefined) {
      data.ruleType = input.ruleType?.trim() || null;
    }
    if (input.gender !== undefined) {
      data.gender = input.gender?.trim() || null;
    }
    if (input.ageGroup !== undefined) {
      data.ageGroup = input.ageGroup?.trim() || null;
    }
    if (input.weightClass !== undefined) {
      data.weightClass = input.weightClass?.trim() || null;
    }
    if (input.skillLevel !== undefined) {
      data.skillLevel = input.skillLevel?.trim() || null;
    }

    await eventRepository.updateEventDivision(input.divisionId, data);
  },

  async deleteEventDivision(
    actor: ActorContext,
    input: DeleteEventDivisionInput,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, input.eventId);
    const ok = await eventRepository.findDivisionBelongsToEvent(
      input.divisionId,
      input.eventId,
    );
    if (!ok) {
      throw new AppError("NOT_FOUND", "부문을 찾을 수 없습니다.");
    }

    const event = await eventRepository.findOrganizerEventById(input.eventId);
    if (!event) throw new AppError("NOT_FOUND", "대회를 찾을 수 없습니다.");

    if (
      event.status === EventStatus.open &&
      event.divisions.length <= 1
    ) {
      throw new AppError(
        "CONFLICT",
        "신청 공개 중에는 마지막 부문을 삭제할 수 없습니다.",
      );
    }

    const [appCount, bracketCount] = await Promise.all([
      eventRepository.countApplicationsByDivision(input.divisionId),
      eventRepository.countBracketsByDivision(input.divisionId),
    ]);
    if (appCount > 0 || bracketCount > 0) {
      throw new AppError(
        "CONFLICT",
        "신청 또는 대진표가 연결된 부문은 삭제할 수 없습니다.",
      );
    }

    await eventRepository.deleteEventDivision(input.divisionId);
  },

  async upsertEventPaymentSetting(
    actor: ActorContext,
    input: UpsertEventPaymentSettingInput,
  ): Promise<void> {
    await requireOrganizerForEvent(actor, input.eventId);
    await eventRepository.upsertEventPaymentSetting({
      eventId: input.eventId,
      feeAmount: input.feeAmount,
      bankName: input.bankName.trim(),
      accountNumber: input.accountNumber.trim(),
      accountHolder: input.accountHolder.trim(),
      depositorRule: input.depositorRule?.trim() || null,
      paymentDueDate: input.paymentDueDate ?? null,
    });
  },
};
