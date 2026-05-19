import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white border border-border rounded-md p-4",
        "transition-transform hover:-translate-y-px",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
