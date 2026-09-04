import { summarizeProviderPayload } from "../utils/matchon-secret-mask";
import type { MatchonAligoTransport } from "../transport/matchon-aligo-transport";

const ALIGO_REMAIN_URL = "https://apis.aligo.in/remain/";

export type TenantAligoCredentials = {
  loginId: string;
  apiKey: string;
  senderPhone: string;
};

export type TenantAligoConnectionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * Aligo remain API — SMS 발송 없이 credential 유효성 확인.
 * Secret은 응답/로그에 포함하지 않는다.
 */
export async function testTenantAligoConnection(
  credentials: TenantAligoCredentials,
  transport?: MatchonAligoTransport,
): Promise<TenantAligoConnectionResult> {
  const form = {
    key: credentials.apiKey,
    user_id: credentials.loginId,
  };

  const { MatchonAligoHttpTransport } = await import(
    "../transport/matchon-aligo-transport"
  );
  const client = transport ?? new MatchonAligoHttpTransport();
  const res = await client.request({
    url: ALIGO_REMAIN_URL,
    form,
    timeoutMs: 10_000,
    requestId: "tenant-connection-test",
  });

  if (res.errorCode === "PROVIDER_TIMEOUT") {
    return { ok: false, message: "알리고 서버 응답 시간이 초과되었습니다." };
  }
  if (res.errorCode === "PROVIDER_NETWORK_ERROR") {
    return { ok: false, message: "알리고 서버에 연결할 수 없습니다." };
  }

  const data = res.data as {
    result_code?: string | number;
    message?: string;
    SMS_CNT?: string | number;
    LMS_CNT?: string | number;
  };
  const resultCode = String(data?.result_code ?? "");
  if (resultCode === "1") {
    return { ok: true, message: "알리고 연결이 확인되었습니다." };
  }

  const providerMessage = data?.message
    ? String(data.message).slice(0, 200)
    : "알리고 인증에 실패했습니다.";
  return {
    ok: false,
    message: providerMessage,
  };
}

export type TenantAligoSendInput = {
  credentials: TenantAligoCredentials;
  receiver: string;
  body: string;
  subject?: string | null;
  msgType: "SMS" | "LMS";
  dispatchId: string;
  recipientId: string;
};

export type TenantAligoSendResult = {
  accepted: boolean;
  providerMessageId?: string;
  providerCode?: string;
  providerMessage?: string;
  retryable: boolean;
  rawResponseSummary?: string;
};

const ALIGO_SEND_URL = "https://apis.aligo.in/send/";

export async function sendTenantAligoSms(
  input: TenantAligoSendInput,
  transport?: MatchonAligoTransport,
): Promise<TenantAligoSendResult> {
  const form: Record<string, string> = {
    key: input.credentials.apiKey,
    user_id: input.credentials.loginId,
    sender: input.credentials.senderPhone,
    receiver: input.receiver,
    msg: input.body,
    msg_type: input.msgType,
  };
  if (input.msgType === "LMS" && input.subject) {
    form.title = input.subject;
  }

  const { MatchonAligoHttpTransport } = await import(
    "../transport/matchon-aligo-transport"
  );
  const client = transport ?? new MatchonAligoHttpTransport();
  const res = await client.request({
    url: ALIGO_SEND_URL,
    form,
    timeoutMs: 15_000,
    requestId: `${input.dispatchId}:${input.recipientId}`,
  });

  if (res.errorCode === "PROVIDER_TIMEOUT") {
    return {
      accepted: false,
      retryable: true,
      providerCode: "TIMEOUT",
      providerMessage: "발송 시간 초과",
      rawResponseSummary: res.summary,
    };
  }
  if (res.errorCode === "PROVIDER_NETWORK_ERROR") {
    return {
      accepted: false,
      retryable: true,
      providerCode: "NETWORK",
      providerMessage: "네트워크 오류",
      rawResponseSummary: res.summary,
    };
  }

  const data = res.data as {
    result_code?: string | number;
    message?: string;
    msg_id?: string;
  };
  const resultCode = String(data?.result_code ?? "");
  if (resultCode === "1") {
    return {
      accepted: true,
      providerMessageId: data?.msg_id ? String(data.msg_id) : undefined,
      providerCode: "OK",
      providerMessage: data?.message ? String(data.message) : "accepted",
      retryable: false,
      rawResponseSummary: summarizeProviderPayload({
        result_code: resultCode,
        msg_id: data?.msg_id,
      }),
    };
  }

  return {
    accepted: false,
    retryable: false,
    providerCode: "REJECTED",
    providerMessage: data?.message
      ? String(data.message).slice(0, 200)
      : "발송이 거부되었습니다.",
    rawResponseSummary: summarizeProviderPayload({ result_code: resultCode }),
  };
}
