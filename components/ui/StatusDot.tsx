import { cn } from "@/lib/cn";
import type { PieceStatus } from "@/lib/supabase/types";
import { Pill } from "./Pill";

const MAP: Record<PieceStatus, { tone: "green" | "blue" | "orange" | "gray" | "red"; label: string; pulse?: boolean }> = {
  queued:    { tone: "gray",   label: "Queued" },
  writing:   { tone: "blue",   label: "Writing", pulse: true },
  rendering: { tone: "orange", label: "Rendering", pulse: true },
  ready:     { tone: "blue",   label: "Ready" },
  flagged:   { tone: "orange", label: "Flagged" },
  failed:    { tone: "red",    label: "Failed" },
  approved:  { tone: "green",  label: "Approved" },
  rejected:  { tone: "gray",   label: "Rejected" },
  review:    { tone: "orange", label: "Review" },
  published: { tone: "green",  label: "Published" },
};

export function StatusDot({ status, size = "sm" }: { status: PieceStatus; size?: "sm" | "md" }) {
  const m = MAP[status] ?? { tone: "gray" as const, label: status };
  return (
    <Pill tone={m.tone} size={size}>
      <span className={cn("size-1.5 rounded-full bg-current", m.pulse && "live-pulse")} />
      {m.label}
    </Pill>
  );
}
