import type { Organization } from "@/lib/types/organization";

// 4-state health signal for the org list and detail screens.
//   INACTIVE — crawler is off; no signal expected.
//   GREEN    — last success within 7 days and no recent failures.
//   YELLOW   — at least one failure in the last week, but we've succeeded
//              recently. Operator should glance at the next run.
//   RED      — never succeeded, or 3+ consecutive failures, or last success
//              older than 30 days. Operator action needed.

export type HealthLevel = "INACTIVE" | "GREEN" | "YELLOW" | "RED";

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeHealth(org: Organization): HealthLevel {
  if (!org.crawlEnabled) return "INACTIVE";
  const status = org.crawlStatus;
  if (!status?.lastSuccessAt) return "RED";

  const consecutiveFailures = status.consecutiveFailures ?? 0;
  const daysSinceSuccess =
    (Date.now() - status.lastSuccessAt.toMillis()) / DAY_MS;

  if (consecutiveFailures >= 3 || daysSinceSuccess > 30) return "RED";
  if (consecutiveFailures >= 1 || daysSinceSuccess > 7) return "YELLOW";
  return "GREEN";
}

export const HEALTH_COLORS: Record<HealthLevel, string> = {
  INACTIVE: "#B0A89A",
  GREEN: "#16a34a",
  YELLOW: "#d97706",
  RED: "#dc2626",
};

export const HEALTH_LABELS: Record<HealthLevel, string> = {
  INACTIVE: "비활성",
  GREEN: "정상",
  YELLOW: "주의",
  RED: "오류",
};
