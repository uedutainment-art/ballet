import { HEALTH_COLORS, HEALTH_LABELS, type HealthLevel } from "@/lib/organization/health";

type Props = {
  level: HealthLevel;
  size?: number;
};

export function HealthDot({ level, size = 10 }: Props) {
  return (
    <span
      title={HEALTH_LABELS[level]}
      aria-label={HEALTH_LABELS[level]}
      className="inline-block rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: HEALTH_COLORS[level],
        opacity: level === "INACTIVE" ? 0.4 : 1,
      }}
    />
  );
}
