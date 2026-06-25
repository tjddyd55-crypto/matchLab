/**
 * [CONTRACT] PrismaClient import는 `src/lib/repositories` 내부에만 허용한다.
 */
import type { Prisma } from "@/generated/prisma";
import {
  BracketStatus,
  EventStatus,
  MatchRecordStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function db(tx?: Prisma.TransactionClient) {
  return tx ?? prisma;
}

const excludedFromPublic: EventStatus[] = [
  EventStatus.draft,
  EventStatus.cancelled,
];

async function loadEventOrganizerId(
  eventId: string,
): Promise<string | null> {
  const row = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });
  return row?.organizerId ?? null;
}

const divisionPreviewSelect = {
  sportType: true,
  ruleType: true,
  gender: true,
  ageGroup: true,
  weightClass: true,
  skillLevel: true,
} as const;

const listSelect = {
  id: true,
  publicSlug: true,
  title: true,
  location: true,
  eventDate: true,
  registrationStartDate: true,
  registrationEndDate: true,
  status: true,
  posterUrl: true,
  liveStreamingEnabled: true,
  organizer: { select: { name: true } },
  divisions: {
    select: divisionPreviewSelect,
    orderBy: { createdAt: "asc" as const },
    take: 6,
  },
  _count: { select: { divisions: true } },
  images: {
    select: { imageUrl: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
} as const;

const detailHeaderSelect = {
  id: true,
  publicSlug: true,
  title: true,
  description: true,
  location: true,
  roadAddress: true,
  jibunAddress: true,
  detailAddress: true,
  locationName: true,
  eventDate: true,
  registrationStartDate: true,
  registrationEndDate: true,
  status: true,
  posterUrl: true,
  photoRecordingEnabled: true,
  videoRecordingEnabled: true,
  liveStreamingEnabled: true,
  streamingNoticeText: true,
  streamingConsentRequired: true,
  spectatorAccessEnabled: true,
  spectatorAccessStartAt: true,
  spectatorAccessEndAt: true,
  spectatorAccessToken: true,
  publicUnmatchedListEnabled: true,
  organizer: { select: { name: true } },
  images: {
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

export type PublicEventListRecord = Prisma.EventGetPayload<{
  select: typeof listSelect;
}>;

export type PublicEventDetailRecord = Prisma.EventGetPayload<{
  select: typeof detailHeaderSelect;
}>;

export type PublicEventDivisionRecord = Prisma.EventDivisionGetPayload<{
  select: {
    id: true;
    sportType: true;
    ruleType: true;
    gender: true;
    ageGroup: true;
    weightClass: true;
    skillLevel: true;
  };
}>;

export type PublicEventPaymentSummaryRecord =
  Prisma.EventPaymentSettingGetPayload<{
    select: {
      feeAmount: true;
      bankName: true;
      accountHolder: true;
      depositorRule: true;
    };
  }>;

export const eventRepository = {
  async ping(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },

  async isPublicSlugTaken(
    slug: string,
    excludeEventId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const row = await db(tx).event.findFirst({
      where: {
        publicSlug: slug,
        ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(row);
  },

  async listOrganizerEvents(
    organizerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).event.findMany({
      where: { organizerId },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        publicSlug: true,
        title: true,
        location: true,
        eventDate: true,
        registrationStartDate: true,
        registrationEndDate: true,
        status: true,
        posterUrl: true,
        liveStreamingEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { applications: true } },
      },
    });
  },

  async listAllEventsForAdmin(tx?: Prisma.TransactionClient) {
    return db(tx).event.findMany({
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        organizerId: true,
        publicSlug: true,
        title: true,
        location: true,
        eventDate: true,
        registrationStartDate: true,
        registrationEndDate: true,
        status: true,
        organizer: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
    });
  },

  /** 주최자 관리 화면 — draft 포함, 계좌번호 포함 */
  /** 관람 제한(spectator window)용 — 공개 slug 행사만 */
  async findPublicSpectatorPolicyBySlug(
    slug: string,
  ): Promise<{
    spectatorAccessEnabled: boolean;
    spectatorAccessStartAt: Date | null;
    spectatorAccessEndAt: Date | null;
  } | null> {
    const row = await prisma.event.findFirst({
      where: {
        publicSlug: slug,
        status: { notIn: excludedFromPublic },
      },
      select: {
        spectatorAccessEnabled: true,
        spectatorAccessStartAt: true,
        spectatorAccessEndAt: true,
      },
    });
    return row;
  },

  async findOrganizerEventById(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).event.findUnique({
      where: { id: eventId },
      include: {
        organizer: { select: { id: true, name: true } },
        divisions: { orderBy: { createdAt: "asc" } },
        paymentSetting: true,
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { applications: true } },
      },
    });
  },

  async createEvent(
    data: Prisma.EventCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).event.create({ data });
  },

  async updateEvent(
    eventId: string,
    data: Prisma.EventUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).event.update({
      where: { id: eventId },
      data,
    });
  },

  async updateEventStatus(
    eventId: string,
    status: EventStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).event.update({
      where: { id: eventId },
      data: { status },
    });
  },

  /** MVP: 물리 삭제 대신 상태만 `cancelled` 로 바꾸는 용도로도 사용 가능 */
  async deleteOrCancelEvent(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).event.update({
      where: { id: eventId },
      data: { status: EventStatus.cancelled },
    });
  },

  async listEventDivisions(eventId: string, tx?: Prisma.TransactionClient) {
    return db(tx).eventDivision.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });
  },

  async createEventDivision(
    data: Prisma.EventDivisionCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventDivision.create({ data });
  },

  async updateEventDivision(
    divisionId: string,
    data: Prisma.EventDivisionUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventDivision.update({
      where: { id: divisionId },
      data,
    });
  },

  async deleteEventDivision(
    divisionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventDivision.delete({
      where: { id: divisionId },
    });
  },

  async deleteEventPaymentSetting(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await db(tx).eventPaymentSetting.deleteMany({
      where: { eventId },
    });
  },

  async upsertEventPaymentSetting(
    data: {
      eventId: string;
      feeAmount: number;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      depositorRule?: string | null;
      paymentDueDate?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventPaymentSetting.upsert({
      where: { eventId: data.eventId },
      create: {
        eventId: data.eventId,
        feeAmount: data.feeAmount,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolder: data.accountHolder,
        depositorRule: data.depositorRule ?? null,
        paymentDueDate: data.paymentDueDate ?? null,
      },
      update: {
        feeAmount: data.feeAmount,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolder: data.accountHolder,
        depositorRule: data.depositorRule ?? null,
        paymentDueDate: data.paymentDueDate ?? null,
      },
    });
  },

  async findEventPaymentSetting(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventPaymentSetting.findUnique({
      where: { eventId },
    });
  },

  async countApplicationsByEvent(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return db(tx).eventApplication.count({ where: { eventId } });
  },

  async countApplicationsByDivision(
    divisionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return db(tx).eventApplication.count({ where: { divisionId } });
  },

  async countBracketsByDivision(
    divisionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return db(tx).bracket.count({ where: { divisionId } });
  },

  /** 이벤트 소유 Organizer PK — 권한 검증용 (`findEventOwnershipContext` 별칭) */
  async findEventOwnershipContext(
    eventId: string,
  ): Promise<{ organizerId: string } | null> {
    const organizerId = await loadEventOrganizerId(eventId);
    return organizerId ? { organizerId } : null;
  },

  async findEventOwnerContext(
    eventId: string,
  ): Promise<{ organizerId: string } | null> {
    return eventRepository.findEventOwnershipContext(eventId);
  },

  async findEventOrganizerId(eventId: string): Promise<string | null> {
    return loadEventOrganizerId(eventId);
  },

  /** 공개 목록 — draft·cancelled 제외 */
  async listPublicEvents(): Promise<PublicEventListRecord[]> {
    return prisma.event.findMany({
      where: { status: { notIn: excludedFromPublic } },
      orderBy: [{ eventDate: "asc" }, { registrationStartDate: "asc" }],
      select: listSelect,
    });
  },

  /** 공개 상세 헤더 — slug 기준, draft·cancelled 는 미존재와 동일 */
  async findEventPublicationSettings(eventId: string) {
    return prisma.event.findUnique({
      where: { id: eventId },
      select: {
        publicSlug: true,
        publicUnmatchedListEnabled: true,
      },
    });
  },

  async findPublicEventBySlug(
    slug: string,
  ): Promise<PublicEventDetailRecord | null> {
    return prisma.event.findFirst({
      where: {
        publicSlug: slug,
        status: { notIn: excludedFromPublic },
      },
      select: detailHeaderSelect,
    });
  },

  async findPublicEventDivisions(
    eventId: string,
  ): Promise<PublicEventDivisionRecord[]> {
    return prisma.eventDivision.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        sportType: true,
        ruleType: true,
        gender: true,
        ageGroup: true,
        weightClass: true,
        skillLevel: true,
      },
    });
  },

  /** 공개 대진표 존재 여부 — isPublic + published/ongoing/finished */
  async findEventIdsWithPublicBrackets(
    eventIds: string[],
  ): Promise<Set<string>> {
    if (eventIds.length === 0) return new Set();
    const rows = await prisma.bracket.findMany({
      where: {
        eventId: { in: eventIds },
        isPublic: true,
        status: {
          in: [
            BracketStatus.published,
            BracketStatus.ongoing,
            BracketStatus.finished,
          ],
        },
      },
      select: { eventId: true },
      distinct: ["eventId"],
    });
    return new Set(rows.map((row) => row.eventId));
  },

  /** 공개 결과 존재 여부 — confirmed MatchResult만 */
  async findEventIdsWithPublicResults(
    eventIds: string[],
  ): Promise<Set<string>> {
    if (eventIds.length === 0) return new Set();
    const rows = await prisma.matchResult.findMany({
      where: {
        eventId: { in: eventIds },
        status: MatchRecordStatus.confirmed,
      },
      select: { eventId: true },
      distinct: ["eventId"],
    });
    return new Set(rows.map((row) => row.eventId));
  },

  /** 계좌번호(accountNumber)는 select 하지 않음 */
  async findPublicEventPaymentSummary(
    eventId: string,
  ): Promise<PublicEventPaymentSummaryRecord | null> {
    return prisma.eventPaymentSetting.findUnique({
      where: { eventId },
      select: {
        feeAmount: true,
        bankName: true,
        accountHolder: true,
        depositorRule: true,
      },
    });
  },

  /** 체육관 신청 완료 화면 등 인증된 흐름 전용 — accountNumber 포함 */
  async findEventPaymentSettingFull(eventId: string) {
    return prisma.eventPaymentSetting.findUnique({
      where: { eventId },
    });
  },

  async findDivisionBelongsToEvent(
    divisionId: string,
    eventId: string,
  ): Promise<boolean> {
    const row = await prisma.eventDivision.findFirst({
      where: { id: divisionId, eventId },
      select: { id: true },
    });
    return Boolean(row);
  },

  async findDivisionEventId(
    divisionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string | null> {
    const row = await db(tx).eventDivision.findUnique({
      where: { id: divisionId },
      select: { eventId: true },
    });
    return row?.eventId ?? null;
  },

  async findEventDivisionById(
    divisionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return db(tx).eventDivision.findUnique({
      where: { id: divisionId },
    });
  },

  async findEventWithDivisionsForApplication(eventId: string) {
    return prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizerId: true,
        title: true,
        status: true,
        registrationStartDate: true,
        registrationEndDate: true,
        liveStreamingEnabled: true,
        streamingConsentRequired: true,
        streamingNoticeText: true,
        applicationFormTemplateId: true,
        applicationFormTemplate: {
          select: {
            id: true,
            title: true,
            originalPdfFileName: true,
            originalPdfPath: true,
            fieldsJson: true,
            repeatGroupsJson: true,
            manualFieldsJson: true,
          },
        },
        organizer: { select: { name: true } },
        divisions: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            sportType: true,
            ruleType: true,
            gender: true,
            ageGroup: true,
            weightClass: true,
            skillLevel: true,
          },
        },
      },
    });
  },

  /** 체육관 대회 목록 — 공개 상태(draft·cancelled 제외), 신청 기간과 무관하게 전부 조회 */
  async listEventsForGymDashboard(): Promise<
    Prisma.EventGetPayload<{
      select: {
        id: true;
        title: true;
        publicSlug: true;
        eventDate: true;
        registrationStartDate: true;
        registrationEndDate: true;
        status: true;
        liveStreamingEnabled: true;
        streamingConsentRequired: true;
        organizer: { select: { name: true } };
        _count: { select: { divisions: true } };
        paymentSetting: { select: { eventId: true } };
      };
    }>[]
  > {
    return prisma.event.findMany({
      where: { status: { notIn: excludedFromPublic } },
      orderBy: [{ eventDate: "asc" }, { registrationEndDate: "asc" }],
      select: {
        id: true,
        title: true,
        publicSlug: true,
        eventDate: true,
        registrationStartDate: true,
        registrationEndDate: true,
        status: true,
        liveStreamingEnabled: true,
        streamingConsentRequired: true,
        organizer: { select: { name: true } },
        _count: { select: { divisions: true } },
        paymentSetting: { select: { eventId: true } },
      },
    });
  },
};
