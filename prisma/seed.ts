import "dotenv/config";

import type { Fighter } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";
import {
  ApplicationStatus,
  AuditAction,
  BracketChangeType,
  BracketMatchOutcomeStyle,
  BracketMatchStatus,
  BracketStatus,
  BracketType,
  ConsentStatus,
  DuplicateCheckStatus,
  EventStatus,
  FighterRegistrationSubmissionStatus,
  FighterStatus,
  GymStatus,
  InviteLinkStatus,
  InviteLinkType,
  LivePlatform,
  LiveStreamStatus,
  MatchRecordOutcome,
  MatchRecordStatus,
  NextMatchSlot,
  NotificationType,
  OrganizerStatus,
  OrganizerType,
  PaymentStatus,
  StreamType,
  UserRole,
} from "../src/lib/enums";

/** 로컬에서 Supabase Auth `user.id`(UUID)와 맞출 개발용 매핑 (`docs/dev-start.md`) */
const DEV_AUTH_USER_IDS = {
  admin: "550e8400-e29b-41d4-a716-446655440001",
  organizer: "550e8400-e29b-41d4-a716-446655440002",
  gym: "550e8400-e29b-41d4-a716-446655440003",
  fighter: "550e8400-e29b-41d4-a716-446655440004",
} as const;

function fighterCardJson(input: {
  id: string;
  code: string;
  name: string;
  gymName: string;
  wins: number;
  losses: number;
  draws: number;
}) {
  return {
    fighterId: input.id,
    fighterCode: input.code,
    displayName: input.name,
    gymName: input.gymName,
    weightClassLabel: null,
    sportTypeLabel: null,
    profileImageUrl: null,
    recordWin: input.wins,
    recordLoss: input.losses,
    recordDraw: input.draws,
  };
}

async function wipeDevData() {
  await prisma.matchResultChangeLog.deleteMany();
  await prisma.matchResult.deleteMany();
  await prisma.bracketChangeLog.deleteMany();
  await prisma.bracketMatch.updateMany({ data: { nextMatchId: null } });
  await prisma.bracketMatch.deleteMany();
  await prisma.bracket.deleteMany();
  await prisma.eventApplicationPayment.deleteMany();
  await prisma.eventApplication.deleteMany();
  await prisma.eventLiveStream.deleteMany();
  await prisma.eventPaymentSetting.deleteMany();
  await prisma.guardianConsent.deleteMany();
  await prisma.fighterRegistrationSubmission.deleteMany();
  await prisma.gymInviteLink.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.fighterGymHistory.deleteMany();
  await prisma.fighter.deleteMany();
  await prisma.eventDivision.deleteMany();
  await prisma.event.deleteMany();
  await prisma.organizer.deleteMany();
  await prisma.gym.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await wipeDevData();

  const adminUser = await prisma.user.create({
    data: {
      authUserId: DEV_AUTH_USER_IDS.admin,
      email: "admin@example.com",
      name: "시스템 관리자",
      role: UserRole.admin,
    },
  });

  const organizerUser = await prisma.user.create({
    data: {
      authUserId: DEV_AUTH_USER_IDS.organizer,
      email: "organizer@example.com",
      name: "김주최",
      role: UserRole.organizer,
    },
  });

  const gymOwnerUser = await prisma.user.create({
    data: {
      authUserId: DEV_AUTH_USER_IDS.gym,
      email: "gym@example.com",
      name: "이관장",
      role: UserRole.gym,
    },
  });

  const fighterAccountUser = await prisma.user.create({
    data: {
      authUserId: DEV_AUTH_USER_IDS.fighter,
      email: "fighter1@example.com",
      name: "박파이터",
      role: UserRole.fighter,
    },
  });

  const organizer = await prisma.organizer.create({
    data: {
      userId: organizerUser.id,
      name: "테스트 협회",
      type: OrganizerType.association,
      status: OrganizerStatus.active,
    },
  });

  const gym = await prisma.gym.create({
    data: {
      ownerUserId: gymOwnerUser.id,
      name: "테스트 체육관",
      phone: "010-0000-0001",
      address: "서울시 샘플구",
      status: GymStatus.active,
    },
  });

  const fightersData = [
    {
      code: "FTR-2026-000001",
      name: "박파이터",
      birth: new Date("2008-03-15"),
      gender: "male",
      phone: "010-1111-0001",
      userId: fighterAccountUser.id,
    },
    {
      code: "FTR-2026-000002",
      name: "최라이트",
      birth: new Date("2009-07-22"),
      gender: "male",
      phone: "010-1111-0002",
    },
    {
      code: "FTR-2026-000003",
      name: "정미들",
      birth: new Date("2010-01-02"),
      gender: "female",
      phone: "010-1111-0003",
    },
    {
      code: "FTR-2026-000004",
      name: "강헤비",
      birth: new Date("2007-11-30"),
      gender: "male",
      phone: "010-1111-0004",
    },
  ];

  const fighters: Fighter[] = [];
  for (const f of fightersData) {
    const fighter = await prisma.fighter.create({
      data: {
        fighterCode: f.code,
        userId: f.userId ?? null,
        currentGymId: gym.id,
        name: f.name,
        birthDate: f.birth,
        gender: f.gender,
        phone: f.phone,
        height: 165 + fighters.length,
        weight: 55 + fighters.length,
        profileImageUrl: null,
        recordWin: 0,
        recordLoss: 0,
        recordDraw: 0,
        status: FighterStatus.active,
      },
    });
    fighters.push(fighter);
    await prisma.fighterGymHistory.create({
      data: {
        fighterId: fighter.id,
        gymId: gym.id,
        status: "active",
      },
    });
  }

  const [f1, f2, f3, f4] = fighters;

  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      title: "2026 샘플 오픈 대회",
      description: "시드 데이터로 목록·신청·대진표·라이브 개발 확인용",
      location: "올림픽공원 체조경기장",
      eventDate: new Date("2026-06-01T10:00:00.000Z"),
      registrationStartDate: new Date("2026-04-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-05-25T23:59:59.000Z"),
      status: EventStatus.open,
      posterUrl: null,
      publicSlug: "sample-open-2026",
      photoRecordingEnabled: true,
      videoRecordingEnabled: true,
      liveStreamingEnabled: true,
      streamingNoticeText: "본 대회는 유튜브 라이브로 송출됩니다.",
      streamingConsentRequired: true,
    },
  });

  const divLight = await prisma.eventDivision.create({
    data: {
      eventId: event.id,
      sportType: "kickboxing",
      ruleType: "amateur",
      gender: "male",
      ageGroup: "U14",
      weightClass: "-55kg",
      skillLevel: "beginner",
    },
  });

  const divMiddle = await prisma.eventDivision.create({
    data: {
      eventId: event.id,
      sportType: "kickboxing",
      ruleType: "amateur",
      gender: "male",
      ageGroup: "U16",
      weightClass: "-60kg",
      skillLevel: "intermediate",
    },
  });

  await prisma.eventPaymentSetting.create({
    data: {
      eventId: event.id,
      feeAmount: 80000,
      bankName: "샘플은행",
      accountNumber: "123-456-789012",
      accountHolder: "(주)테스트주최",
      depositorRule: "신청선수명 + 체육관명",
      paymentDueDate: new Date("2026-05-28T23:59:59.000Z"),
    },
  });

  const gymSnap = { gymId: gym.id, name: gym.name };

  const app1 = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: divLight.id,
      gymId: gym.id,
      fighterId: f1.id,
      status: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.paid,
      fighterSnapshot: fighterCardJson({
        id: f1.id,
        code: f1.fighterCode,
        name: f1.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      gymSnapshot: gymSnap,
    },
  });

  const app2 = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: divLight.id,
      gymId: gym.id,
      fighterId: f2.id,
      status: ApplicationStatus.pending,
      paymentStatus: PaymentStatus.unpaid,
      fighterSnapshot: fighterCardJson({
        id: f2.id,
        code: f2.fighterCode,
        name: f2.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      gymSnapshot: gymSnap,
    },
  });

  const app3 = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: divMiddle.id,
      gymId: gym.id,
      fighterId: f3.id,
      status: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.pending_check,
      fighterSnapshot: fighterCardJson({
        id: f3.id,
        code: f3.fighterCode,
        name: f3.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      gymSnapshot: gymSnap,
    },
  });

  const app4 = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: divMiddle.id,
      gymId: gym.id,
      fighterId: f4.id,
      status: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.paid,
      fighterSnapshot: fighterCardJson({
        id: f4.id,
        code: f4.fighterCode,
        name: f4.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      gymSnapshot: gymSnap,
    },
  });

  await prisma.eventApplicationPayment.create({
    data: {
      eventApplicationId: app2.id,
      amount: 80000,
      paymentStatus: PaymentStatus.unpaid,
    },
  });

  await prisma.eventApplicationPayment.create({
    data: {
      eventApplicationId: app1.id,
      amount: 80000,
      paymentStatus: PaymentStatus.paid,
      depositorName: `${f1.name} ${gym.name}`,
      confirmedByUserId: organizerUser.id,
      confirmedAt: new Date(),
    },
  });

  await prisma.eventApplicationPayment.create({
    data: {
      eventApplicationId: app3.id,
      amount: 80000,
      paymentStatus: PaymentStatus.pending_check,
      depositorName: `${f3.name}`,
    },
  });

  await prisma.eventApplicationPayment.create({
    data: {
      eventApplicationId: app4.id,
      amount: 80000,
      paymentStatus: PaymentStatus.paid,
      depositorName: `${f4.name}`,
      confirmedByUserId: organizerUser.id,
      confirmedAt: new Date(),
    },
  });

  const invite = await prisma.gymInviteLink.create({
    data: {
      gymId: gym.id,
      token: "seed-token-fighter-reg",
      type: InviteLinkType.fighter_registration,
      status: InviteLinkStatus.active,
      createdByUserId: gymOwnerUser.id,
      maxUses: 100,
    },
  });

  const submission = await prisma.fighterRegistrationSubmission.create({
    data: {
      gymId: gym.id,
      inviteLinkId: invite.id,
      name: "임시등록요청",
      birthDate: new Date("2011-05-05"),
      gender: "female",
      phone: "010-9999-9999",
      status: FighterRegistrationSubmissionStatus.submitted,
      duplicateCheckStatus: DuplicateCheckStatus.unchecked,
    },
  });

  await prisma.guardianConsent.create({
    data: {
      registrationSubmissionId: submission.id,
      eventId: event.id,
      guardianName: "임시보호자",
      guardianPhone: "010-8888-8888",
      relationship: "모",
      documentTitle: "대회 참가 보호자 동의서",
      documentVersion: "2026-05-v1",
      consentStatus: ConsentStatus.completed,
      signatureImagePath: "private/consents/seed/sample-consent-signature.png",
      signedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
  });

  const bracketElim = await prisma.bracket.create({
    data: {
      eventId: event.id,
      divisionId: divLight.id,
      title: "라이트급 토너먼트",
      type: BracketType.single_elimination,
      status: BracketStatus.published,
      isPublic: true,
    },
  });

  const bracketList = await prisma.bracket.create({
    data: {
      eventId: event.id,
      divisionId: divMiddle.id,
      title: "미들급 매치 리스트",
      type: BracketType.match_list,
      status: BracketStatus.published,
      isPublic: true,
    },
  });

  const elimFinal = await prisma.bracketMatch.create({
    data: {
      bracketId: bracketElim.id,
      round: 2,
      roundName: "결승",
      matchOrder: 1,
      globalMatchOrder: 3,
      matNumber: 1,
      status: BracketMatchStatus.waiting,
    },
  });

  const elimSemi1 = await prisma.bracketMatch.create({
    data: {
      bracketId: bracketElim.id,
      round: 1,
      roundName: "준준결승",
      matchOrder: 1,
      globalMatchOrder: 1,
      matNumber: 1,
      fighterRedId: f1.id,
      fighterBlueId: f2.id,
      fighterRedSnapshot: fighterCardJson({
        id: f1.id,
        code: f1.fighterCode,
        name: f1.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      fighterBlueSnapshot: fighterCardJson({
        id: f2.id,
        code: f2.fighterCode,
        name: f2.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      winnerId: f1.id,
      loserId: f2.id,
      status: BracketMatchStatus.finished,
      resultType: BracketMatchOutcomeStyle.decision,
      nextMatchId: elimFinal.id,
      nextMatchSlot: NextMatchSlot.red,
      endedAt: new Date(),
    },
  });

  await prisma.bracketMatch.create({
    data: {
      bracketId: bracketElim.id,
      round: 1,
      roundName: "준준결승",
      matchOrder: 2,
      globalMatchOrder: 2,
      matNumber: 1,
      fighterRedId: f3.id,
      fighterBlueId: f4.id,
      fighterRedSnapshot: fighterCardJson({
        id: f3.id,
        code: f3.fighterCode,
        name: f3.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      fighterBlueSnapshot: fighterCardJson({
        id: f4.id,
        code: f4.fighterCode,
        name: f4.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      status: BracketMatchStatus.waiting,
      nextMatchId: elimFinal.id,
      nextMatchSlot: NextMatchSlot.blue,
    },
  });

  await prisma.bracketMatch.create({
    data: {
      bracketId: bracketList.id,
      round: 1,
      roundName: "카드 1",
      matchOrder: 1,
      globalMatchOrder: 10,
      matNumber: 2,
      fighterRedId: f3.id,
      fighterBlueId: f4.id,
      fighterRedSnapshot: fighterCardJson({
        id: f3.id,
        code: f3.fighterCode,
        name: f3.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      fighterBlueSnapshot: fighterCardJson({
        id: f4.id,
        code: f4.fighterCode,
        name: f4.name,
        gymName: gym.name,
        wins: 0,
        losses: 0,
        draws: 0,
      }),
      status: BracketMatchStatus.waiting,
    },
  });

  await prisma.eventLiveStream.create({
    data: {
      eventId: event.id,
      title: "메인 매트 라이브",
      platform: LivePlatform.youtube,
      streamType: StreamType.main,
      watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      status: LiveStreamStatus.scheduled,
      isPublic: true,
    },
  });

  const divisionSnap = {
    divisionId: divLight.id,
    label: `${divLight.weightClass} ${divLight.ageGroup}`,
  };

  const confirmedAt = new Date();
  await prisma.matchResult.createMany({
    data: [
      {
        eventId: event.id,
        bracketId: bracketElim.id,
        matchId: elimSemi1.id,
        fighterId: f1.id,
        opponentFighterId: f2.id,
        gymId: gym.id,
        opponentGymId: gym.id,
        result: MatchRecordOutcome.win,
        resultType: BracketMatchOutcomeStyle.decision,
        eventTitleSnapshot: event.title,
        fighterSnapshot: fighterCardJson({
          id: f1.id,
          code: f1.fighterCode,
          name: f1.name,
          gymName: gym.name,
          wins: 0,
          losses: 0,
          draws: 0,
        }),
        opponentSnapshot: fighterCardJson({
          id: f2.id,
          code: f2.fighterCode,
          name: f2.name,
          gymName: gym.name,
          wins: 0,
          losses: 0,
          draws: 0,
        }),
        divisionSnapshot: divisionSnap,
        matchDate: event.eventDate,
        status: MatchRecordStatus.confirmed,
        confirmedByUserId: organizerUser.id,
        confirmedAt,
      },
      {
        eventId: event.id,
        bracketId: bracketElim.id,
        matchId: elimSemi1.id,
        fighterId: f2.id,
        opponentFighterId: f1.id,
        gymId: gym.id,
        opponentGymId: gym.id,
        result: MatchRecordOutcome.loss,
        resultType: BracketMatchOutcomeStyle.decision,
        eventTitleSnapshot: event.title,
        fighterSnapshot: fighterCardJson({
          id: f2.id,
          code: f2.fighterCode,
          name: f2.name,
          gymName: gym.name,
          wins: 0,
          losses: 0,
          draws: 0,
        }),
        opponentSnapshot: fighterCardJson({
          id: f1.id,
          code: f1.fighterCode,
          name: f1.name,
          gymName: gym.name,
          wins: 0,
          losses: 0,
          draws: 0,
        }),
        divisionSnapshot: divisionSnap,
        matchDate: event.eventDate,
        status: MatchRecordStatus.confirmed,
        confirmedByUserId: organizerUser.id,
        confirmedAt,
      },
    ],
  });

  await prisma.fighter.update({
    where: { id: f1.id },
    data: { recordWin: 1 },
  });
  await prisma.fighter.update({
    where: { id: f2.id },
    data: { recordLoss: 1 },
  });

  await prisma.notification.create({
    data: {
      userId: organizerUser.id,
      eventId: event.id,
      type: NotificationType.event_notice,
      title: "대회 시드 데이터 생성됨",
      content: "개발용 알림입니다.",
      href: `/organizer/events/${event.id}/matches`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: gymOwnerUser.id,
      eventId: event.id,
      type: NotificationType.event_notice,
      title: "신청 상태 알림 (샘플)",
      content: "체육관 계정용 시연 알림입니다.",
      href: `/gym/applications`,
    },
  });

  await prisma.bracketChangeLog.create({
    data: {
      eventId: event.id,
      bracketId: bracketElim.id,
      matchId: elimSemi1.id,
      changedByUserId: organizerUser.id,
      bracketType: BracketType.single_elimination,
      changeType: BracketChangeType.match_status_changed,
      afterData: { note: "시드 예시: 경기 상태 변경 기록" },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUser.id,
      action: AuditAction.admin_adjustment,
      targetType: "seed",
      targetId: "initial",
      afterData: { message: "개발 시드 삽입" },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: organizerUser.id,
      action: AuditAction.event_status_changed,
      targetType: "Event",
      targetId: event.id,
      beforeData: { status: EventStatus.draft },
      afterData: { status: EventStatus.open },
    },
  });

  console.info("[seed] 완료", {
    adminUserId: adminUser.id,
    eventSlug: event.publicSlug,
    fighters: fighters.map((x) => x.fighterCode),
    inviteToken: invite.token,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
