export { loadMatchonMessagingConfig, canMatchonRealSend } from "./config/matchon-messaging-config";
export {
  MatchonMessagingError,
  MatchonMessagingErrorCode,
} from "./domain/matchon-message-errors";
export type { CreateMessageDispatchCommand } from "./domain/matchon-message-types";
export { MatchonMessagingService, matchonMessagingService } from "./services/matchon-messaging.service";
export { matchonMessagingDiagnosticsService } from "./services/matchon-messaging-diagnostics.service";
export { matchonMessageTemplateService } from "./services/matchon-message-template.service";
export {
  normalizeMatchonPhone,
  validateMatchonPhone,
  formatMatchonPhone,
  maskMatchonPhone,
} from "./utils/matchon-phone";
export { classifyMatchonSmsMessage } from "./utils/matchon-sms-length";
export { renderMatchonMessageTemplate } from "./templates/matchon-message-template-renderer";
export { computeMatchonTemplateFingerprint } from "./templates/matchon-template-fingerprint";
export { MatchonDryRunProvider } from "./providers/matchon-dry-run-provider";
export type { MatchonMessagingProvider } from "./providers/matchon-messaging-provider";
