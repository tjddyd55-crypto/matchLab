import "server-only";

import {
  AssociationApplicationStatus,
  GymApplicationStatus,
} from "@/lib/enums";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";
import { loginIdSchema } from "@/lib/validators/login-id.validator";
import type { Prisma } from "@/generated/prisma";

const BLOCKING_ASSOCIATION_STATUSES: AssociationApplicationStatus[] = [
  AssociationApplicationStatus.pending,
  AssociationApplicationStatus.under_review,
  AssociationApplicationStatus.approved,
];

const BLOCKING_GYM_STATUSES: GymApplicationStatus[] = [
  GymApplicationStatus.pending,
  GymApplicationStatus.under_review,
  GymApplicationStatus.approved,
];

export type ApplicationRequestedLoginIdCheck = {
  available: boolean;
  loginId: string;
  message: string;
};

type TxClient = Prisma.TransactionClient;

function db(client?: TxClient) {
  return client ?? prisma;
}

export function parseRequiredRequestedLoginId(raw: string | undefined): string {
  const parsed = loginIdSchema.safeParse(raw ?? "");
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ??
        "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.",
    );
  }
  return parsed.data;
}

export async function assertApplicationRequestedLoginIdAvailable(
  loginId: string,
  options?: {
    excludeAssociationApplicationId?: string;
    excludeGymApplicationId?: string;
    excludeUserId?: string;
    client?: TxClient;
  },
): Promise<void> {
  const client = db(options?.client);

  // 신청·승인·초대 수락이 같은 트랜잭션 안에서 호출될 때 동시 예약 race 를 직렬화한다.
  if (options?.client) {
    await options.client
      .$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`app-login-id:${loginId}`}))`;
  }

  const user = await client.user.findFirst({
    where: {
      loginId,
      ...(options?.excludeUserId ? { NOT: { id: options.excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (user) {
    throw new AppError(
      "CONFLICT",
      "이미 사용 중인 로그인 아이디입니다. 다른 아이디를 입력해 주세요.",
    );
  }

  const assoc = await client.associationApplication.findFirst({
    where: {
      requestedLoginId: loginId,
      deletedAt: null,
      status: { in: BLOCKING_ASSOCIATION_STATUSES },
      ...(options?.excludeAssociationApplicationId
        ? { NOT: { id: options.excludeAssociationApplicationId } }
        : {}),
    },
    select: { id: true },
  });
  if (assoc) {
    throw new AppError(
      "CONFLICT",
      "이미 가입 신청에 사용된 로그인 아이디입니다. 다른 아이디를 입력해 주세요.",
    );
  }

  const gym = await client.gymApplication.findFirst({
    where: {
      requestedLoginId: loginId,
      deletedAt: null,
      status: { in: BLOCKING_GYM_STATUSES },
      ...(options?.excludeGymApplicationId
        ? { NOT: { id: options.excludeGymApplicationId } }
        : {}),
    },
    select: { id: true },
  });
  if (gym) {
    throw new AppError(
      "CONFLICT",
      "이미 가입 신청에 사용된 로그인 아이디입니다. 다른 아이디를 입력해 주세요.",
    );
  }
}

export async function checkApplicationRequestedLoginIdAvailability(
  loginIdRaw: string,
  options?: {
    excludeAssociationApplicationId?: string;
    excludeGymApplicationId?: string;
    excludeUserId?: string;
  },
): Promise<ApplicationRequestedLoginIdCheck> {
  const parsed = loginIdSchema.safeParse(loginIdRaw);
  if (!parsed.success) {
    return {
      available: false,
      loginId: loginIdRaw.trim().toLowerCase(),
      message:
        parsed.error.issues[0]?.message ??
        "영문 소문자, 숫자, _, -를 사용해 4~20자로 입력해 주세요.",
    };
  }
  try {
    await assertApplicationRequestedLoginIdAvailable(parsed.data, options);
    return {
      available: true,
      loginId: parsed.data,
      message: "사용 가능한 아이디입니다.",
    };
  } catch (e) {
    if (e instanceof AppError) {
      return {
        available: false,
        loginId: parsed.data,
        message: e.message,
      };
    }
    throw e;
  }
}
