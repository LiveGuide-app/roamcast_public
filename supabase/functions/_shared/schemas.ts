import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// LiveKit-related schemas
export const liveKitTokenSchema = z.object({
  tourId: z.string().uuid(),
  role: z.enum(["guide", "listener"]),
  deviceId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Stripe-related schemas
export const stripeOnboardingSchema = z.object({
  userId: z.string().uuid(),
  returnUrl: z.string().url(),
});

export const stripeDashboardLinkSchema = z.object({
  userId: z.string().uuid(),
});

export const tipPaymentSchema = z.object({
  tourParticipantId: z.string().uuid(),
  amount: z.number().int().min(100).max(10000), // Amount in cents, max 100 currency units
  currency: z.string().length(3), // ISO 4217 currency code
  deviceId: z.string(),
}); 