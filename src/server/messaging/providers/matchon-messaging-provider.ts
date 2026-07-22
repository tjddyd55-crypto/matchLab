import type {
  ProviderConfigurationResult,
  ProviderSendRequest,
  ProviderSendResult,
} from "../domain/matchon-message-types";
import type { MessageChannel } from "../domain/matchon-message-types";

export interface MatchonMessagingProvider {
  readonly channel: MessageChannel;
  validateConfiguration(): Promise<ProviderConfigurationResult>;
  send(request: ProviderSendRequest): Promise<ProviderSendResult>;
}
