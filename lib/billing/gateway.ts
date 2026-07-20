// Payment gateway boundary. Choosing the actual vendor (Omise / 2C2P / …) is a
// Phase 3.5 decision that requires a human — CLAUDE.md lists "เลือก payment
// vendor" as a stop-and-ask point. So Phase 3.1 defines the INTERFACE the app
// codes against and ships a mock that performs no real charge. When 3.5 picks a
// vendor, only this file gains a real implementation; call sites don't change.

import type { DesignerPlan } from "./plans";

export interface CheckoutRequest {
  orgId: string;
  plan: DesignerPlan;
  seats: number;
}

export type CheckoutResult =
  | { status: "unavailable"; reason: "payment_not_configured" }
  | { status: "redirect"; url: string };

export interface PaymentGateway {
  /** Begin a checkout for a plan upgrade. */
  startCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
}

// Mock gateway: no vendor, no charge. It reports that payment isn't wired up yet
// so the UI can show "coming soon" instead of pretending to bill anyone.
export const mockGateway: PaymentGateway = {
  async startCheckout() {
    return { status: "unavailable", reason: "payment_not_configured" };
  },
};

// Single accessor so 3.5 can swap the implementation in one place.
export function paymentGateway(): PaymentGateway {
  return mockGateway;
}
