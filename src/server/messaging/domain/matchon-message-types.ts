import type {
  MatchonMessageChannel,
  MatchonMessageDispatchStatus,
  MatchonMessageOwnerType,
  MatchonMessageRecipientStatus,
  MatchonMessageSourceType,
} from "@/lib/enums";

export type MessageChannel = MatchonMessageChannel;
export type MessageSourceType = MatchonMessageSourceType;
export type MessageDispatchStatus = MatchonMessageDispatchStatus;
export type MessageRecipientStatus = MatchonMessageRecipientStatus;
export type MessageOwnerType = MatchonMessageOwnerType;

export type MatchonMessageReferenceType =
  | "gym_member"
  | "fighter"
  | "event_application"
  | "organizer"
  | "user"
  | "custom";

export type MatchonTemplateVariableSchema = Record<
  string,
  {
    required?: boolean;
    type?: "string" | "number" | "date";
  }
>;

export type MatchonTemplateButton = {
  name: string;
  type: string;
  url?: string;
  urlMobile?: string;
  urlPc?: string;
};

export type MatchonDispatchRecipientInput = {
  referenceType?: MatchonMessageReferenceType | string;
  referenceId?: string;
  name?: string;
  phone: string;
  variables?: Record<string, string | number | null | undefined>;
};

export type CreateMessageDispatchCommand = {
  ownerType: MessageOwnerType;
  gymId?: string | null;
  sourceType: MessageSourceType;
  channel: MessageChannel;
  templateId?: string | null;
  title?: string | null;
  subject?: string | null;
  body?: string | null;
  recipients: MatchonDispatchRecipientInput[];
  requestedByUserId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  /** 관리자 테스트 등에서 실발송을 명시적으로 허용할 때만 true — 단독으로는 실발송 불가 */
  allowRealSend?: boolean;
};

export type ProviderConfigurationResult = {
  ok: boolean;
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

export type ProviderSendRequest = {
  dispatchId: string;
  recipientId: string;
  recipientPhone: string;
  recipientName?: string;
  subject?: string;
  body: string;
  templateCode?: string;
  templateVariables?: Record<string, string>;
  buttons?: MatchonTemplateButton[];
  sender?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type ProviderSendResult = {
  accepted: boolean;
  dryRun: boolean;
  retryable: boolean;
  providerMessageId?: string;
  providerCode?: string;
  providerMessage?: string;
  sentAt?: Date;
  rawResponseSummary?: string;
  blocked?: boolean;
  blockedReason?: string;
};
