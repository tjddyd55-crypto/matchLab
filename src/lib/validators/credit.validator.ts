import { z } from "zod";

export const manualChargeSchema = z.object({
  organizerId: z.string().min(1),
  amount: z.coerce.number().int().positive().max(10_000_000),
  memo: z.string().max(500).optional(),
});

export const createPaymentOrderSchema = z.object({
  planId: z.string().min(1),
});

export const confirmPaymentOrderSchema = z.object({
  orderId: z.string().min(1),
  paymentKey: z.string().max(200).optional(),
});

export const cancelPaymentOrderSchema = z.object({
  orderId: z.string().min(1),
});
