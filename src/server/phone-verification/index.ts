export {
  loadMatchonPhoneVerificationConfig,
  canMatchonAuthSmsRealSend,
  isMatchonProductionRuntime,
} from "./config/matchon-phone-verification-config";
export { matchonPhoneVerificationService } from "./services/matchon-phone-verification.service";
export {
  isMatchonAuthSmsE2eInboxAllowed,
  getMatchonAuthSmsE2eCode,
} from "./e2e/matchon-auth-sms-e2e-inbox";
