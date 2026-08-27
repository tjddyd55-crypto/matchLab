/**
 * Payment provider adapter — PG 연결 전 계층.
 * Production mock success 금지. Toss 등 실연동은 이 인터페이스 뒤에 붙인다.
 */

export type PaymentProviderCreateInput = {
  orderId: string;
  amount: number;
  orderName: string;
  customerKey: string;
  successUrl: string;
  failUrl: string;
  metadata?: Record<string, unknown>;
};

export type PaymentProviderCreateResult = {
  provider: string;
  pgReady: boolean;
  checkoutUrl?: string | null;
  clientConfig?: Record<string, unknown> | null;
  message?: string;
};

export type PaymentProviderConfirmInput = {
  orderId: string;
  paymentKey: string;
  amount: number;
};

export type PaymentProviderConfirmResult = {
  provider: string;
  providerPaymentId: string;
  paidAmount: number;
  raw?: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(
    input: PaymentProviderCreateInput,
  ): Promise<PaymentProviderCreateResult>;
  confirmPayment(
    input: PaymentProviderConfirmInput,
  ): Promise<PaymentProviderConfirmResult>;
  cancelPayment?(input: {
    providerPaymentId: string;
    reason: string;
  }): Promise<void>;
  getPayment?(providerPaymentId: string): Promise<unknown>;
}

/**
 * Placeholder until Toss (or chosen PG) credentials exist.
 * Never marks payments as paid.
 */
export const nonePaymentProvider: PaymentProvider = {
  name: "none",
  async createPayment() {
    return {
      provider: "none",
      pgReady: false,
      checkoutUrl: null,
      clientConfig: null,
      message:
        "PG 연동 전입니다. 무료 쿠폰으로 이용을 시작하거나 관리자에게 문의하세요.",
    };
  },
  async confirmPayment() {
    throw new Error(
      "PaymentProvider(none)는 유료 결제 확인을 지원하지 않습니다.",
    );
  },
};

export function getPaymentProvider(): PaymentProvider {
  const name = String(process.env.MATCHON_BILLING_PROVIDER ?? "none")
    .trim()
    .toLowerCase();
  if (name === "none" || name === "") {
    return nonePaymentProvider;
  }
  // Future: toss provider when env + SDK are ready.
  return nonePaymentProvider;
}
