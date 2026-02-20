import { Counter } from "prom-client";
import { logger } from "../logging/logger";
import { metricsRegistry } from "../middleware/metrics";

const businessEventsTotal = new Counter({
  name: "business_events_total",
  help: "Business-level product events",
  labelNames: ["event_name", "wallet_type"] as const,
  registers: [metricsRegistry]
});

export type BusinessEventName =
  | "signup_started"
  | "activation_completed"
  | "payment_intent_created"
  | "agent_started"
  | "agent_stopped";

export function trackBusinessEvent(
  eventName: BusinessEventName,
  walletType:
    | "kasware"
    | "kastle"
    | "kaspium"
    | "kng_web"
    | "kng_mobile"
    | "ledger_kasvault"
    | "cli_wallet"
    | "unknown",
  metadata?: Record<string, unknown>
): void {
  businessEventsTotal.inc({ event_name: eventName, wallet_type: walletType });
  logger.info({ eventName, walletType, metadata }, "Business event tracked");
}
