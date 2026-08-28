import "server-only";

import {
  assertTossSecretConfigured,
  tossBasicAuthHeader,
} from "@/lib/billing/toss-env";

const TOSS_API = "https://api.tosspayments.com";

export type TossIssueBillingKeyResult = {
  billingKey: string;
  customerKey: string;
  cardCompany: string | null;
  cardLast4: string | null;
  raw: Record<string, unknown>;
};

export type TossChargeResult = {
  paymentKey: string;
  orderId: string;
  amount: number;
  status: string;
  method: string | null;
  raw: Record<string, unknown>;
};

export class TossBillingApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = "TossBillingApiError";
  }
}

async function tossFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const { secretKey } = assertTossSecretConfigured();
  const headers: Record<string, string> = {
    Authorization: tossBasicAuthHeader(secretKey),
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) {
    headers["Idempotency-Key"] = init.idempotencyKey;
  }

  const res = await fetch(`${TOSS_API}${path}`, {
    ...init,
    headers,
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = String(json.code ?? "TOSS_ERROR");
    const message = String(json.message ?? `Toss API error ${res.status}`);
    throw new TossBillingApiError(code, message, res.status);
  }
  return json as T;
}

function maskBillingKey(key: string): string {
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}

export const tossBillingApi = {
  maskBillingKey,

  /** POST /v1/billing/authorizations/issue */
  async issueBillingKey(input: {
    authKey: string;
    customerKey: string;
  }): Promise<TossIssueBillingKeyResult> {
    const raw = await tossFetch<Record<string, unknown>>(
      "/v1/billing/authorizations/issue",
      {
        method: "POST",
        body: JSON.stringify({
          authKey: input.authKey,
          customerKey: input.customerKey,
        }),
      },
    );

    const billingKey = String(raw.billingKey ?? "");
    if (!billingKey) {
      throw new TossBillingApiError(
        "MISSING_BILLING_KEY",
        "빌링키 발급 응답에 billingKey가 없습니다.",
        500,
      );
    }

    const card = (raw.card ?? null) as Record<string, unknown> | null;
    const number = card && typeof card.number === "string" ? card.number : "";
    const last4 =
      number.length >= 4
        ? number.slice(-4)
        : card && typeof card.cardNumber === "string"
          ? String(card.cardNumber).slice(-4)
          : null;

    return {
      billingKey,
      customerKey: String(raw.customerKey ?? input.customerKey),
      cardCompany:
        (card && (card.company as string)) ||
        (card && (card.issuerCode as string)) ||
        (typeof raw.cardCompany === "string" ? raw.cardCompany : null),
      cardLast4: last4,
      raw,
    };
  },

  /** POST /v1/billing/{billingKey} */
  async charge(input: {
    billingKey: string;
    customerKey: string;
    amount: number;
    orderId: string;
    orderName: string;
    idempotencyKey: string;
  }): Promise<TossChargeResult> {
    const raw = await tossFetch<Record<string, unknown>>(
      `/v1/billing/${encodeURIComponent(input.billingKey)}`,
      {
        method: "POST",
        idempotencyKey: input.idempotencyKey,
        body: JSON.stringify({
          customerKey: input.customerKey,
          amount: input.amount,
          orderId: input.orderId,
          orderName: input.orderName,
        }),
      },
    );

    return {
      paymentKey: String(raw.paymentKey ?? ""),
      orderId: String(raw.orderId ?? input.orderId),
      amount: Number(raw.totalAmount ?? raw.balanceAmount ?? input.amount),
      status: String(raw.status ?? "DONE"),
      method: typeof raw.method === "string" ? raw.method : null,
      raw,
    };
  },

  /** DELETE /v1/billing/{billingKey} — best effort */
  async deleteBillingKey(billingKey: string): Promise<void> {
    try {
      await tossFetch(`/v1/billing/${encodeURIComponent(billingKey)}`, {
        method: "DELETE",
      });
    } catch {
      // Non-fatal: replacement may still proceed with new key as default.
    }
  },
};
