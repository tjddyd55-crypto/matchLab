import { summarizeProviderPayload } from "../utils/matchon-secret-mask";

export type AligoTransportRequest = {
  url: string;
  method?: "POST" | "GET";
  form?: Record<string, string>;
  timeoutMs: number;
  requestId: string;
};

export type AligoTransportResponse = {
  ok: boolean;
  status: number;
  data: unknown;
  latencyMs: number;
  summary: string;
  errorCode?: string;
  errorMessage?: string;
};

export interface MatchonAligoTransport {
  request(input: AligoTransportRequest): Promise<AligoTransportResponse>;
}

export class FakeAligoTransport implements MatchonAligoTransport {
  public calls: AligoTransportRequest[] = [];
  constructor(
    private readonly handler?: (
      input: AligoTransportRequest,
    ) => Promise<AligoTransportResponse> | AligoTransportResponse,
  ) {}

  async request(input: AligoTransportRequest): Promise<AligoTransportResponse> {
    this.calls.push(input);
    if (this.handler) return this.handler(input);
    return {
      ok: true,
      status: 200,
      data: { result_code: "1", message: "fake" },
      latencyMs: 1,
      summary: "fake-ok",
    };
  }
}

/**
 * 실제 HTTP transport. 생성만으로는 호출되지 않으며,
 * ALLOW_REAL_SEND 가드 통과 후에만 provider가 호출한다.
 */
export class MatchonAligoHttpTransport implements MatchonAligoTransport {
  async request(input: AligoTransportRequest): Promise<AligoTransportResponse> {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const body = new URLSearchParams(input.form ?? {});
      const res = await fetch(input.url, {
        method: input.method ?? "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-Matchon-Request-Id": input.requestId,
        },
        body: body.toString(),
        signal: controller.signal,
      });
      const text = await res.text();
      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch {
        // keep text
      }
      return {
        ok: res.ok,
        status: res.status,
        data,
        latencyMs: Date.now() - started,
        summary: summarizeProviderPayload(data),
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const aborted = /abort/i.test(message);
      return {
        ok: false,
        status: 0,
        data: null,
        latencyMs: Date.now() - started,
        summary: aborted ? "timeout" : "network_error",
        errorCode: aborted ? "PROVIDER_TIMEOUT" : "PROVIDER_NETWORK_ERROR",
        errorMessage: message.slice(0, 200),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
