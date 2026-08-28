export {};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (opts: { customerKey: string }) => {
        requestBillingAuth: (opts: {
          method: "CARD";
          successUrl: string;
          failUrl: string;
          customerName?: string;
        }) => Promise<void>;
      };
    };
  }
}
