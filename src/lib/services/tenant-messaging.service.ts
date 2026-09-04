import "server-only";

import {
  MatchonMessageChannel,
  MatchonMessageDispatchStatus,
  MatchonMessageOwnerType,
  MatchonMessageRecipientStatus,
  MatchonMessageSourceType,
  MessagingProviderOwnerType,
  TenantFeatureOwnerType,
} from "@/generated/prisma";
import type { ActorContext } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import {
  dedupeMessagingRecipients,
  summarizeMessagingRecipients,
  type MessagingRecipientCandidate,
} from "@/lib/messaging/messaging-phone";
import { matchonMessageRepository } from "@/lib/repositories/matchon-message.repository";
import { messagingProviderSettingsService } from "@/lib/services/messaging-provider-settings.service";
import { tenantFeatureEntitlementService } from "@/lib/services/tenant-feature-entitlement.service";
import { classifyMatchonSmsMessage } from "@/server/messaging/utils/matchon-sms-length";
import { formatMatchonPhone } from "@/server/messaging/utils/matchon-phone";
import { buildIdempotencyScope } from "@/server/messaging/domain/matchon-message-policy";
import {
  sendTenantAligoSms,
  type TenantAligoCredentials,
} from "@/server/messaging/services/tenant-aligo-connection-test";
import { FakeAligoTransport } from "@/server/messaging/transport/matchon-aligo-transport";

const TENANT_CHUNK_SIZE = 50;

export type TenantMessagingOwner =
  | { ownerType: "association"; organizerId: string }
  | { ownerType: "gym"; gymId: string };

export type BulkMessagePreviewInput = {
  owner: TenantMessagingOwner;
  recipients: MessagingRecipientCandidate[];
  message: string;
  title?: string | null;
  metadata?: Record<string, unknown>;
};

export type BulkMessagePreviewResult = {
  requestedCount: number;
  eligibleCount: number;
  excludedCount: number;
  smsClassification: ReturnType<typeof classifyMatchonSmsMessage>;
  excludedReasons: Array<{ referenceId: string; reason: string }>;
};

export type BulkMessageSendInput = BulkMessagePreviewInput & {
  idempotencyKey: string;
  actor: ActorContext;
};

export type BulkMessageSendResult = {
  dispatchId: string;
  requestedCount: number;
  successCount: number;
  failedCount: number;
  excludedCount: number;
  dryRun: boolean;
};

function tenantDryRunEnabled(): boolean {
  return process.env.MATCHON_TENANT_MESSAGING_DRY_RUN !== "false";
}

function resolveOwnerType(
  owner: TenantMessagingOwner,
): {
  messageOwnerType: MatchonMessageOwnerType;
  providerOwnerType: MessagingProviderOwnerType;
  gymId: string | null;
  organizerId: string | null;
} {
  if (owner.ownerType === "gym") {
    return {
      messageOwnerType: MatchonMessageOwnerType.gym,
      providerOwnerType: MessagingProviderOwnerType.gym,
      gymId: owner.gymId,
      organizerId: null,
    };
  }
  return {
    messageOwnerType: MatchonMessageOwnerType.association,
    providerOwnerType: MessagingProviderOwnerType.association,
    gymId: null,
    organizerId: owner.organizerId,
  };
}

function toTenantFeatureOwnerType(
  ownerType: MessagingProviderOwnerType,
): TenantFeatureOwnerType {
  return ownerType === MessagingProviderOwnerType.association
    ? TenantFeatureOwnerType.association
    : TenantFeatureOwnerType.gym;
}

async function resolveCredentials(owner: TenantMessagingOwner) {
  const scope = resolveOwnerType(owner);
  const ownerId =
    owner.ownerType === "gym" ? owner.gymId : owner.organizerId;

  await tenantFeatureEntitlementService.requireTenantMessaging(
    toTenantFeatureOwnerType(scope.providerOwnerType),
    ownerId,
  );

  const config = await messagingProviderSettingsService.resolveDecryptedConfig(
    scope.providerOwnerType,
    ownerId,
  );
  if (!config) {
    throw new AppError(
      "VALIDATION_ERROR",
      "문자 발송 설정이 완료되지 않았습니다.",
    );
  }
  return config;
}

export const tenantMessagingService = {
  previewBulkMessage(input: BulkMessagePreviewInput): BulkMessagePreviewResult {
    const deduped = dedupeMessagingRecipients(input.recipients);
    const summary = summarizeMessagingRecipients(deduped);
    const smsClassification = classifyMatchonSmsMessage({
      body: input.message,
      subject: input.title,
    });
    return {
      requestedCount: summary.requestedCount,
      eligibleCount: summary.eligibleCount,
      excludedCount: summary.excludedCount,
      smsClassification,
      excludedReasons: summary.excluded.map((r) => ({
        referenceId: r.referenceId,
        reason: r.excludedReason ?? "제외",
      })),
    };
  },

  async sendBulkMessage(input: BulkMessageSendInput): Promise<BulkMessageSendResult> {
    const preview = this.previewBulkMessage(input);
    if (!preview.smsClassification.isValid) {
      throw new AppError(
        "VALIDATION_ERROR",
        preview.smsClassification.validationMessage ??
          "메시지 내용을 확인해 주세요.",
      );
    }
    if (preview.eligibleCount === 0) {
      throw new AppError("VALIDATION_ERROR", "발송 가능한 수신자가 없습니다.");
    }

    const credentials = await resolveCredentials(input.owner);
    const scope = resolveOwnerType(input.owner);
    const idempotencyScope = buildIdempotencyScope(
      scope.messageOwnerType,
      scope.gymId,
      scope.organizerId,
    );

    const existing = await matchonMessageRepository.findDispatchByIdempotency(
      idempotencyScope,
      input.idempotencyKey,
    );
    if (existing) {
      return {
        dispatchId: existing.id,
        requestedCount: existing.requestedCount,
        successCount: existing.successCount,
        failedCount: existing.failureCount,
        excludedCount: existing.excludedCount,
        dryRun: existing.dryRun,
      };
    }

    const deduped = dedupeMessagingRecipients(input.recipients);
    const summary = summarizeMessagingRecipients(deduped);
    const channel =
      preview.smsClassification.type === "lms"
        ? MatchonMessageChannel.lms
        : MatchonMessageChannel.sms;

    const dryRun = tenantDryRunEnabled();
    const transport = dryRun ? new FakeAligoTransport() : undefined;

    const dispatch = await matchonMessageRepository.createDispatchWithRecipients({
      dispatch: {
        ownerType: scope.messageOwnerType,
        gymId: scope.gymId,
        organizerId: scope.organizerId,
        sourceType: MatchonMessageSourceType.manual,
        channel,
        title: input.title ?? null,
        subjectSnapshot: input.title ?? null,
        bodySnapshot: input.message,
        requestedCount: summary.requestedCount,
        eligibleCount: summary.eligibleCount,
        excludedCount: summary.excludedCount,
        dryRun,
        status: MatchonMessageDispatchStatus.processing,
        idempotencyScope,
        idempotencyKey: input.idempotencyKey,
        createdByUserId: input.actor.userId,
        metadata: {
          ...input.metadata,
          messagePurpose: "manual",
          provider: credentials.provider,
        },
      },
      recipients: deduped.map((r) => ({
        gymId: scope.gymId,
        referenceType: r.referenceType,
        referenceId: r.referenceId,
        recipientNameSnapshot: r.name ?? null,
        phoneSnapshot: formatMatchonPhone(r.normalizedPhone) || r.phone,
        normalizedPhone: r.normalizedPhone,
        channel,
        subjectSnapshot: input.title ?? null,
        bodySnapshot: input.message,
        status: r.eligible
          ? MatchonMessageRecipientStatus.pending
          : MatchonMessageRecipientStatus.excluded,
        excludedReason: r.excludedReason ?? null,
      })),
    });

    let successCount = 0;
    let failureCount = 0;
    const creds: TenantAligoCredentials = {
      loginId: credentials.loginId,
      apiKey: credentials.apiKey,
      senderPhone: credentials.senderPhone,
    };

    const eligibleRecipients = dispatch.recipients.filter(
      (r) => r.status === MatchonMessageRecipientStatus.pending,
    );

    for (let i = 0; i < eligibleRecipients.length; i += TENANT_CHUNK_SIZE) {
      const chunk = eligibleRecipients.slice(i, i + TENANT_CHUNK_SIZE);
      for (const recipient of chunk) {
        if (dryRun) {
          successCount += 1;
          await matchonMessageRepository.updateRecipient(recipient.id, {
            status: MatchonMessageRecipientStatus.dry_run,
            providerCode: "DRY_RUN",
            providerMessage: "테스트 모드 — 실제 발송되지 않음",
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
            sentAt: new Date(),
          });
          continue;
        }

        const result = await sendTenantAligoSms(
          {
            credentials: creds,
            receiver: recipient.normalizedPhone,
            body: input.message,
            subject: input.title,
            msgType:
              preview.smsClassification.type === "lms" ? "LMS" : "SMS",
            dispatchId: dispatch.id,
            recipientId: recipient.id,
          },
          transport,
        );

        if (result.accepted) {
          successCount += 1;
          await matchonMessageRepository.updateRecipient(recipient.id, {
            status: MatchonMessageRecipientStatus.accepted,
            providerMessageId: result.providerMessageId,
            providerCode: result.providerCode,
            providerMessage: result.providerMessage,
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
            sentAt: new Date(),
          });
        } else {
          failureCount += 1;
          await matchonMessageRepository.updateRecipient(recipient.id, {
            status: MatchonMessageRecipientStatus.failed,
            providerCode: result.providerCode,
            providerMessage: result.providerMessage,
            attemptCount: { increment: 1 },
            retryable: result.retryable,
            lastAttemptAt: new Date(),
            failedAt: new Date(),
          });
        }
      }
    }

    const status =
      failureCount > 0 && successCount > 0
        ? MatchonMessageDispatchStatus.partially_failed
        : failureCount > 0
          ? MatchonMessageDispatchStatus.failed
          : MatchonMessageDispatchStatus.completed;

    await matchonMessageRepository.updateDispatchResult(dispatch.id, {
      status,
      successCount,
      failureCount,
      excludedCount: summary.excludedCount,
      dryRun,
      completedAt: new Date(),
    });

    return {
      dispatchId: dispatch.id,
      requestedCount: summary.requestedCount,
      successCount,
      failedCount: failureCount,
      excludedCount: summary.excludedCount,
      dryRun,
    };
  },
};
