/**
 * Payment provider adapter — PG 연결 계층.
 * Production mock success 금지.
 */

import { getBillingProviderName } from "@/lib/billing/billing-flags";
import { getTossBillingEnv } from "@/lib/billing/toss-env";

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
  /** Toss Billing Auth uses client SDK; no redirect URL from server. */
  mode: "none" | "toss_billing_auth";
  clientKey?: string | null;
  customerKey?: string | null;
  isTestKey?: boolean;
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
}

export const nonePaymentProvider: PaymentProvider = {
  name: "none",
  async createPayment() {
    return {
      provider: "none",
      pgReady: false,
      mode: "none",
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

export const tossBillingPaymentProvider: PaymentProvider = {
  name: "toss",
  async createPayment(input) {
    const env = await getTossBillingEnv();
    if (!env.pgReady || !env.clientKey) {
      return {
        provider: "toss",
        pgReady: false,
        mode: "none",
        message:
          "현재 온라인 결제 준비 중입니다. 관리자에게 문의해주세요.",
      };
    }
    return {
      provider: "toss",
      pgReady: true,
      mode: "toss_billing_auth",
      clientKey: env.clientKey,
      customerKey: input.customerKey,
      isTestKey: env.isTestKey,
      message: env.isTestKey ? "TEST 결제" : undefined,
    };
  },
  async confirmPayment() {
    throw new Error(
      "Toss Billing은 confirmPayment 대신 billingKey charge를 사용합니다.",
    );
  },
};

export function getPaymentProvider(): PaymentProvider {
  return getBillingProviderName() === "toss"
    ? tossBillingPaymentProvider
    : nonePaymentProvider;
}
