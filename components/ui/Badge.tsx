import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "default"
  | "dday"
  | "status-draft"
  | "status-review"
  | "status-ready"
  | "status-published"
  | "status-archived";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

// Status colors are a starting palette — refine when real status flows land.
const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-cream-start text-warm-gray",
  dday: "bg-gold text-white tracking-wider font-medium",
  "status-draft": "bg-warm-gray/20 text-warm-gray",
  "status-review": "bg-yellow-100 text-yellow-700",
  "status-ready": "bg-blue-100 text-blue-700",
  "status-published": "bg-emerald-100 text-emerald-700",
  "status-archived": "bg-gray-100 text-gray-500",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";
