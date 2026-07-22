import {
  MatchonMessageChannel,
  MatchonMessageDispatchStatus,
  MatchonMessageRecipientStatus,
} from "@/lib/enums";
import { matchonMessageRepository } from "@/lib/repositories/matchon-message.repository";
import {
  loadMatchonMessagingConfig,
  type MatchonMessagingConfig,
} from "../config/matchon-messaging-config";
import {
  MatchonMessagingError,
  MatchonMessagingErrorCode,
} from "../domain/matchon-message-errors";
import {
  assertMessagingEnabled,
  assertOwnerScope,
  buildIdempotencyScope,
  evaluateMatchonRealSendGate,
} from "../domain/matchon-message-policy";
import type {
  CreateMessageDispatchCommand,
  MatchonTemplateButton,
  MatchonTemplateVariableSchema,
} from "../domain/matchon-message-types";
import { MatchonDryRunProvider } from "../providers/matchon-dry-run-provider";
import { MatchonAligoSmsProvider } from "../providers/matchon-aligo-sms-provider";
import { MatchonAligoKakaoProvider } from "../providers/matchon-aligo-kakao-provider";
import { FakeAligoTransport } from "../transport/matchon-aligo-transport";
import { renderMatchonMessageTemplate } from "../templates/matchon-message-template-renderer";
import { computeMatchonTemplateFingerprint } from "../templates/matchon-template-fingerprint";
import { classifyMatchonSmsMessage } from "../utils/matchon-sms-length";
import {
  formatMatchonPhone,
  maskMatchonPhone,
  validateMatchonPhone,
} from "../utils/matchon-phone";

export type PreviewDispatchResult = {
  dryRun: boolean;
  realSendAllowed: boolean;
  channel: MatchonMessageChannel;
  subject: string | null;
  body: string;
  smsClassification?: ReturnType<typeof classifyMatchonSmsMessage>;
  templateId?: string | null;
  templateErrors: string[];
  recipients: Array<{
    phone: string;
    maskedPhone: string;
    name?: string;
    eligible: boolean;
    excludedReason?: string;
    body: string;
    subject: string | null;
  }>;
  requestedCount: number;
  eligibleCount: number;
  excludedCount: number;
};

function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === "object") return value as T;
  return fallback;
}

export class MatchonMessagingService {
  constructor(private readonly config: MatchonMessagingConfig = loadMatchonMessagingConfig()) {}

  getConfig() {
    return this.config;
  }

  async previewDispatch(
    command: CreateMessageDispatchCommand,
  ): Promise<PreviewDispatchResult> {
    assertMessagingEnabled(this.config);
    assertOwnerScope(command);

    if (!command.recipients?.length) {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.INVALID_RECIPIENT,
        "수신자가 없습니다.",
      );
    }
    if (command.recipients.length > this.config.maxBatchSize) {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.INVALID_MESSAGE,
        `한 번에 최대 ${this.config.maxBatchSize}명까지 요청할 수 있습니다.`,
      );
    }

    const realGate = evaluateMatchonRealSendGate({
      config: this.config,
      commandAllowRealSend: command.allowRealSend,
    });

    let subject = command.subject ?? null;
    let body = command.body ?? "";
    let templateId = command.templateId ?? null;
    const templateErrors: string[] = [];
    let templateVariablesSchema: MatchonTemplateVariableSchema = {};
    let templateButtons: MatchonTemplateButton[] = [];
    let kakaoTemplateCode: string | null = null;
    let isApproved = false;
    let approvedFingerprint: string | null = null;

    if (command.templateId) {
      const template = await matchonMessageRepository.findTemplateById(
        command.templateId,
      );
      if (!template) {
        throw new MatchonMessagingError(
          MatchonMessagingErrorCode.TEMPLATE_NOT_FOUND,
          "템플릿을 찾을 수 없습니다.",
        );
      }
      if (command.ownerType === "gym" && template.gymId && template.gymId !== command.gymId) {
        throw new MatchonMessagingError(
          MatchonMessagingErrorCode.GYM_SCOPE_MISMATCH,
          "다른 체육관 템플릿은 사용할 수 없습니다.",
        );
      }
      templateId = template.id;
      subject = subject ?? template.subject;
      body = body || template.body;
      templateVariablesSchema = parseJsonObject(template.variables, {});
      templateButtons = parseJsonObject(template.buttons, []);
      kakaoTemplateCode = template.kakaoTemplateCode;
      isApproved = template.isApproved;
      approvedFingerprint = template.approvedFingerprint;
    }

    if (!body.trim() && command.channel !== "kakao_alimtalk") {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.INVALID_MESSAGE,
        "본문이 비어 있습니다.",
      );
    }

    const recipients = command.recipients.map((r) => {
      const phone = validateMatchonPhone(r.phone);
      if (!phone.ok) {
        return {
          phone: r.phone,
          maskedPhone: maskMatchonPhone(r.phone),
          name: r.name,
          eligible: false,
          excludedReason: phone.message ?? "invalid phone",
          body: "",
          subject: null as string | null,
        };
      }

      const rendered = renderMatchonMessageTemplate({
        template: {
          body,
          subject,
          variables: templateVariablesSchema,
          buttons: templateButtons,
        },
        variables: r.variables ?? {},
      });

      if (!rendered.isValid) {
        return {
          phone: phone.normalized,
          maskedPhone: maskMatchonPhone(phone.normalized),
          name: r.name,
          eligible: false,
          excludedReason: rendered.errors.join("; "),
          body: rendered.renderedBody,
          subject: rendered.renderedSubject,
        };
      }

      if (command.channel === "kakao_alimtalk") {
        const fp = computeMatchonTemplateFingerprint({
          body,
          variables: templateVariablesSchema,
          buttons: templateButtons,
        });
        if (!isApproved || !kakaoTemplateCode) {
          return {
            phone: phone.normalized,
            maskedPhone: maskMatchonPhone(phone.normalized),
            name: r.name,
            eligible: false,
            excludedReason: "미승인 알림톡 템플릿",
            body: rendered.renderedBody,
            subject: rendered.renderedSubject,
          };
        }
        if (!approvedFingerprint || approvedFingerprint !== fp) {
          return {
            phone: phone.normalized,
            maskedPhone: maskMatchonPhone(phone.normalized),
            name: r.name,
            eligible: false,
            excludedReason: "template fingerprint mismatch",
            body: rendered.renderedBody,
            subject: rendered.renderedSubject,
          };
        }
      }

      if (command.channel === "sms" || command.channel === "lms") {
        const cls = classifyMatchonSmsMessage({
          body: rendered.renderedBody,
          subject: rendered.renderedSubject,
        });
        if (!cls.isValid) {
          return {
            phone: phone.normalized,
            maskedPhone: maskMatchonPhone(phone.normalized),
            name: r.name,
            eligible: false,
            excludedReason: cls.validationMessage,
            body: rendered.renderedBody,
            subject: rendered.renderedSubject,
          };
        }
      }

      return {
        phone: phone.normalized,
        maskedPhone: maskMatchonPhone(phone.normalized),
        name: r.name,
        eligible: true,
        body: rendered.renderedBody,
        subject: rendered.renderedSubject,
      };
    });

    const eligibleCount = recipients.filter((r) => r.eligible).length;
    const excludedCount = recipients.length - eligibleCount;

    let smsClassification: ReturnType<typeof classifyMatchonSmsMessage> | undefined;
    if (command.channel === "sms" || command.channel === "lms") {
      const sample = recipients.find((r) => r.eligible) ?? recipients[0];
      if (sample) {
        smsClassification = classifyMatchonSmsMessage({
          body: sample.body || body,
          subject: sample.subject ?? subject,
        });
      }
    }

    return {
      dryRun: true,
      realSendAllowed: realGate.allowed,
      channel: command.channel,
      subject,
      body,
      smsClassification,
      templateId,
      templateErrors,
      recipients: recipients.map((r) => ({
        ...r,
        phone: formatMatchonPhone(r.phone) || r.phone,
      })),
      requestedCount: recipients.length,
      eligibleCount,
      excludedCount,
    };
  }

  async createDispatch(command: CreateMessageDispatchCommand) {
    assertMessagingEnabled(this.config);
    assertOwnerScope(command);

    const scope = buildIdempotencyScope(command.ownerType, command.gymId);
    if (command.idempotencyKey) {
      const existing = await matchonMessageRepository.findDispatchByIdempotency(
        scope,
        command.idempotencyKey,
      );
      if (existing) return existing;
    }

    const preview = await this.previewDispatch(command);

    const recipientsData = command.recipients.map((r, idx) => {
      const previewRow = preview.recipients[idx]!;
      const phone = validateMatchonPhone(r.phone);
      return {
        gymId: command.gymId ?? null,
        referenceType: r.referenceType ?? null,
        referenceId: r.referenceId ?? null,
        recipientNameSnapshot: r.name ?? null,
        phoneSnapshot: formatMatchonPhone(phone.normalized) || r.phone,
        normalizedPhone: phone.normalized || "",
        channel: command.channel,
        subjectSnapshot: previewRow.subject,
        bodySnapshot: previewRow.body || preview.body,
        templateVariablesSnapshot: r.variables
          ? (r.variables as object)
          : undefined,
        status: previewRow.eligible
          ? MatchonMessageRecipientStatus.pending
          : MatchonMessageRecipientStatus.excluded,
        excludedReason: previewRow.excludedReason ?? null,
      };
    });

    return matchonMessageRepository.createDispatchWithRecipients({
      dispatch: {
        ownerType: command.ownerType,
        gymId: command.gymId ?? null,
        sourceType: command.sourceType,
        channel: command.channel,
        templateId: preview.templateId ?? null,
        title: command.title ?? null,
        subjectSnapshot: preview.subject,
        bodySnapshot: preview.body || "(empty)",
        requestedCount: preview.requestedCount,
        eligibleCount: preview.eligibleCount,
        excludedCount: preview.excludedCount,
        dryRun: true,
        status: MatchonMessageDispatchStatus.draft,
        idempotencyScope: command.idempotencyKey ? scope : null,
        idempotencyKey: command.idempotencyKey ?? null,
        createdByUserId: command.requestedByUserId ?? null,
        metadata: command.metadata
          ? (JSON.parse(JSON.stringify(command.metadata)) as object)
          : undefined,
      },
      recipients: recipientsData,
    });
  }

  async executeDispatch(
    dispatchId: string,
    options?: { allowRealSend?: boolean },
  ) {
    assertMessagingEnabled(this.config);
    const dispatch = await matchonMessageRepository.getDispatch(dispatchId);
    if (!dispatch) {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.INVALID_MESSAGE,
        "발송 요청을 찾을 수 없습니다.",
      );
    }

    const realGate = evaluateMatchonRealSendGate({
      config: this.config,
      commandAllowRealSend: options?.allowRealSend,
    });

    // 현재 기본: DRY_RUN — 외부 transport 호출 0
    // Fake transport로 adapter 이중 가드 검증 (realSendAllowed=false면 호출 0)
    const fakeTransport = new FakeAligoTransport();

    let successCount = 0;
    let failureCount = 0;
    let excludedCount = 0;

    await matchonMessageRepository.updateDispatchResult(dispatch.id, {
      status: MatchonMessageDispatchStatus.processing,
      successCount: 0,
      failureCount: 0,
      dryRun: true,
      startedAt: new Date(),
    });

    for (const recipient of dispatch.recipients) {
      if (recipient.status === MatchonMessageRecipientStatus.excluded) {
        excludedCount += 1;
        continue;
      }
      // already processed
      if (
        [
          MatchonMessageRecipientStatus.sent,
          MatchonMessageRecipientStatus.accepted,
          MatchonMessageRecipientStatus.delivered,
          MatchonMessageRecipientStatus.dry_run,
          MatchonMessageRecipientStatus.blocked,
        ].includes(recipient.status as never)
      ) {
        if (recipient.status === MatchonMessageRecipientStatus.dry_run) {
          successCount += 1;
        }
        continue;
      }

      const provider =
        dispatch.channel === "kakao_alimtalk"
          ? new MatchonDryRunProvider("kakao_alimtalk")
          : new MatchonDryRunProvider(
              dispatch.channel === "lms" ? "lms" : "sms",
            );

      if (dispatch.channel === "sms" || dispatch.channel === "lms") {
        const smsProvider = new MatchonAligoSmsProvider(
          this.config,
          fakeTransport,
          { commandAllowRealSend: options?.allowRealSend },
        );
        await smsProvider.send({
          dispatchId: dispatch.id,
          recipientId: recipient.id,
          recipientPhone: recipient.normalizedPhone,
          recipientName: recipient.recipientNameSnapshot ?? undefined,
          subject: recipient.subjectSnapshot ?? undefined,
          body: recipient.bodySnapshot,
          idempotencyKey: `${dispatch.id}:${recipient.id}`,
        });
      } else if (dispatch.channel === "kakao_alimtalk") {
        const kakaoProvider = new MatchonAligoKakaoProvider(
          this.config,
          fakeTransport,
          {
            commandAllowRealSend: options?.allowRealSend,
            templateGuard: {
              isApproved: false,
              kakaoTemplateCode: null,
              approvedFingerprint: null,
              currentFingerprint: "execute-dry-run",
            },
          },
        );
        await kakaoProvider.send({
          dispatchId: dispatch.id,
          recipientId: recipient.id,
          recipientPhone: recipient.normalizedPhone,
          recipientName: recipient.recipientNameSnapshot ?? undefined,
          subject: recipient.subjectSnapshot ?? undefined,
          body: recipient.bodySnapshot,
          templateCode: "DRY_RUN",
          idempotencyKey: `${dispatch.id}:${recipient.id}`,
        });
      }

      const result = await provider.send({
        dispatchId: dispatch.id,
        recipientId: recipient.id,
        recipientPhone: recipient.normalizedPhone,
        recipientName: recipient.recipientNameSnapshot ?? undefined,
        subject: recipient.subjectSnapshot ?? undefined,
        body: recipient.bodySnapshot,
        idempotencyKey: `${dispatch.id}:${recipient.id}`,
      });

      if (result.blocked) {
        failureCount += 1;
        await matchonMessageRepository.updateRecipient(recipient.id, {
          status: MatchonMessageRecipientStatus.blocked,
          providerCode: result.providerCode,
          providerMessage: result.providerMessage,
          excludedReason: result.blockedReason,
          attemptCount: { increment: 1 },
          retryable: result.retryable,
          lastAttemptAt: new Date(),
          failedAt: new Date(),
        });
        continue;
      }

      if (result.accepted && result.dryRun) {
        successCount += 1;
        await matchonMessageRepository.updateRecipient(recipient.id, {
          status: MatchonMessageRecipientStatus.dry_run,
          providerCode: result.providerCode,
          providerMessage: result.providerMessage,
          attemptCount: { increment: 1 },
          retryable: false,
          lastAttemptAt: new Date(),
          sentAt: result.sentAt ?? new Date(),
        });
        continue;
      }

      if (result.accepted) {
        successCount += 1;
        await matchonMessageRepository.updateRecipient(recipient.id, {
          status: MatchonMessageRecipientStatus.accepted,
          providerMessageId: result.providerMessageId,
          providerCode: result.providerCode,
          providerMessage: result.providerMessage,
          attemptCount: { increment: 1 },
          retryable: false,
          lastAttemptAt: new Date(),
          sentAt: result.sentAt ?? new Date(),
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

    const status =
      failureCount > 0 && successCount > 0
        ? MatchonMessageDispatchStatus.partially_failed
        : failureCount > 0
          ? MatchonMessageDispatchStatus.failed
          : MatchonMessageDispatchStatus.dry_run;

    await matchonMessageRepository.updateDispatchResult(dispatch.id, {
      status,
      successCount,
      failureCount,
      excludedCount,
      dryRun: true,
      blockedReason: realGate.allowed ? null : realGate.reason,
      completedAt: new Date(),
    });

    if (fakeTransport.calls.length > 0 && !realGate.allowed) {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.REAL_SEND_NOT_ALLOWED,
        "실발송 차단 상태에서 transport가 호출되었습니다.",
        `transportCalls=${fakeTransport.calls.length}`,
      );
    }

    return matchonMessageRepository.getDispatch(dispatch.id);
  }

  async getDispatch(id: string) {
    return matchonMessageRepository.getDispatch(id);
  }

  async listDispatches(params?: { take?: number; skip?: number }) {
    return matchonMessageRepository.listDispatches(params);
  }
}

export const matchonMessagingService = new MatchonMessagingService();
