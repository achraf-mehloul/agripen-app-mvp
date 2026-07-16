// EmptyState with inline SVG illustrations (no external images).
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "plant" | "soil" | "drop" | "cloud" | "search";

export function EmptyState({
  variant = "plant",
  title,
  description,
  action,
  className,
}: {
  variant?: Variant;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-3xl p-8 flex flex-col items-center text-center gap-3 rise-in", className)}>
      <div className="size-24 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-accent/10">
        {ILLUS[variant]}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

const ILLUS: Record<Variant, ReactNode> = {
  plant: (
    <svg viewBox="0 0 64 64" className="size-16" fill="none">
      <path d="M32 54c0-14 6-22 16-24-2 12-8 20-16 24Z" fill="oklch(0.6 0.17 145)" opacity="0.85"/>
      <path d="M32 54c0-14-6-22-16-24 2 12 8 20 16 24Z" fill="oklch(0.5 0.15 150)" opacity="0.85"/>
      <path d="M32 54V32" stroke="oklch(0.35 0.1 155)" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="32" cy="56" rx="14" ry="3" fill="oklch(0.55 0.09 60)" opacity="0.4"/>
    </svg>
  ),
  soil: (
    <svg viewBox="0 0 64 64" className="size-16" fill="none">
      <rect x="8" y="30" width="48" height="24" rx="4" fill="oklch(0.55 0.09 60)"/>
      <circle cx="20" cy="40" r="2" fill="oklch(0.35 0.06 55)"/>
      <circle cx="42" cy="46" r="2.5" fill="oklch(0.35 0.06 55)"/>
      <circle cx="32" cy="38" r="1.5" fill="oklch(0.35 0.06 55)"/>
      <path d="M32 30V18M32 18c-4-4-4-10 0-12M32 18c4-4 4-10 0-12" stroke="oklch(0.55 0.16 148)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  drop: (
    <svg viewBox="0 0 64 64" className="size-16" fill="none">
      <path d="M32 8c-8 12-16 20-16 30a16 16 0 0 0 32 0c0-10-8-18-16-30Z" fill="oklch(0.7 0.12 230)"/>
      <ellipse cx="26" cy="34" rx="4" ry="6" fill="white" opacity="0.4"/>
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 64 64" className="size-16" fill="none">
      <circle cx="42" cy="20" r="8" fill="oklch(0.82 0.16 80)"/>
      <path d="M14 42a10 10 0 0 1 10-10c1-6 6-10 12-10s11 4 12 10a8 8 0 0 1 0 16H24a10 10 0 0 1-10-6Z" fill="oklch(0.9 0.02 230)"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 64 64" className="size-16" fill="none">
      <circle cx="28" cy="28" r="16" stroke="oklch(0.55 0.16 148)" strokeWidth="4"/>
      <path d="m40 40 12 12" stroke="oklch(0.55 0.16 148)" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  ),
};
