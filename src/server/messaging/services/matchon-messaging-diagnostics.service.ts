import { matchonMessageRepository } from "@/lib/repositories/matchon-message.repository";
import {
  hasMatchonKakaoCredentials,
  hasMatchonSmsCredentials,
  loadMatchonMessagingConfig,
  type MatchonMessagingConfig,
} from "../config/matchon-messaging-config";
import { computeMatchonTemplateFingerprint } from "../templates/matchon-template-fingerprint";
import { presenceOnly } from "../utils/matchon-secret-mask";
import type { MatchonTemplateButton, MatchonTemplateVariableSchema } from "../domain/matchon-message-types";

export type MatchonMessagingDiagnostics = {
  messagingEnabled: boolean;
  dryRun: boolean;
  allowRealSend: boolean;
  adminUiEnabled: boolean;
  gymUiEnabled: boolean;
  smsProviderEnabled: boolean;
  smsApiKeyPresent: boolean;
  smsUserIdPresent: boolean;
  smsSenderPresent: boolean;
  kakaoProviderEnabled: boolean;
  kakaoApiKeyPresent: boolean;
  kakaoUserIdPresent: boolean;
  kakaoSenderKeyPresent: boolean;
  kakaoChannelIdPresent: boolean;
  templateTotal: number;
  templateApproved: number;
  fingerprintMismatchCount: number;
  lastDryRunAt: string | null;
  lastBlockedAt: string | null;
  lastProviderErrorSummary: string | null;
  transportCallable: boolean;
  smsFallbackEnabled: boolean;
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (value && typeof value === "object") return value as T;
  return fallback;
}

export class MatchonMessagingDiagnosticsService {
  constructor(private readonly config: MatchonMessagingConfig = loadMatchonMessagingConfig()) {}

  async getDiagnostics(): Promise<MatchonMessagingDiagnostics> {
    const counts = await matchonMessageRepository.countTemplates();
    const templates = await matchonMessageRepository.listTemplates();
    let fingerprintMismatchCount = 0;
    for (const t of templates) {
      if (!t.isApproved) continue;
      const current = computeMatchonTemplateFingerprint({
        body: t.body,
        variables: parseJson<MatchonTemplateVariableSchema>(t.variables, {}),
        buttons: parseJson<MatchonTemplateButton[] | null>(t.buttons, null),
      });
      if (!t.approvedFingerprint || t.approvedFingerprint !== current) {
        fingerprintMismatchCount += 1;
      }
    }

    const lastDryRun = await matchonMessageRepository.findLatestDispatchByStatus(
      "dry_run",
    );
    const lastBlocked = await matchonMessageRepository.findLatestDispatchByStatus(
      "blocked",
    );
    const lastFailed = await matchonMessageRepository.findLatestDispatchByStatus(
      "failed",
    );

    const transportCallable =
      this.config.messagingEnabled &&
      !this.config.dryRun &&
      this.config.allowRealSend &&
      ((this.config.sms.enabled && hasMatchonSmsCredentials(this.config)) ||
        (this.config.kakao.enabled && hasMatchonKakaoCredentials(this.config)));

    return {
      messagingEnabled: this.config.messagingEnabled,
      dryRun: this.config.dryRun,
      allowRealSend: this.config.allowRealSend,
      adminUiEnabled: this.config.adminUiEnabled,
      gymUiEnabled: this.config.gymUiEnabled,
      smsProviderEnabled: this.config.sms.enabled,
      smsApiKeyPresent: presenceOnly(this.config.sms.apiKey),
      smsUserIdPresent: presenceOnly(this.config.sms.userId),
      smsSenderPresent: presenceOnly(this.config.sms.sender),
      kakaoProviderEnabled: this.config.kakao.enabled,
      kakaoApiKeyPresent: presenceOnly(this.config.kakao.apiKey),
      kakaoUserIdPresent: presenceOnly(this.config.kakao.userId),
      kakaoSenderKeyPresent: presenceOnly(this.config.kakao.senderKey),
      kakaoChannelIdPresent: presenceOnly(this.config.kakao.channelId),
      templateTotal: counts.total,
      templateApproved: counts.approved,
      fingerprintMismatchCount,
      lastDryRunAt: lastDryRun?.createdAt.toISOString() ?? null,
      lastBlockedAt: lastBlocked?.createdAt.toISOString() ?? null,
      lastProviderErrorSummary: lastFailed?.blockedReason ?? null,
      transportCallable,
      smsFallbackEnabled: this.config.smsFallbackEnabled,
    };
  }
}

export const matchonMessagingDiagnosticsService =
  new MatchonMessagingDiagnosticsService();
