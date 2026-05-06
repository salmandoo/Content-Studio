// Compatibility shim — old components still import { Piece, Platform, PieceStatus, ... }
// from this path. Re-export from the canonical supabase/types module.
//
// BRAND and RUNS are sample data used by components that haven't been migrated
// to the API. They're kept here only as fallback.

export type { Platform, Format, PieceStatus, RunStatus, Database } from "@/lib/supabase/types";
import type { Database, Platform, Format, PieceStatus } from "@/lib/supabase/types";

// Aliases that match the old shape some components used.
export type Piece = Database["public"]["Tables"]["pieces"]["Row"] & {
  briefId?: string;
  durationSeconds?: number;
  dimensions?: { w: number; h: number; fps: number };
  renderSeconds?: number;
  tokensIn?: number;
  tokensOut?: number;
  costCents?: number;
  generatedAt?: string;
  flagReason?: string;
  scenes?: { type: "text" | "image_with_overlay" | "chart"; text?: string; durationFrames: number }[];
  captions?: { startMs: number; endMs: number; text: string }[];
};

export type Run = Database["public"]["Tables"]["runs"]["Row"] & {
  source?: "prompt" | "pdf" | "excel";
  sourceLabel?: string;
  startedAt?: string;
  durationMs?: number;
  brand?: string;
  costCents?: number;
  pieces?: Piece[];
};

// Minimal placeholder so Sidebar's "recent runs" still compiles.
// Real runs come from /api/runs at runtime.
export const RUNS: Run[] = [];

// Placeholder brand for token editor / contrast matrix until they're wired up.
export const BRAND = {
  name: "Studio",
  voice: "",
  visual: "",
  tokens: {
    brand: "studio",
    primary: "#007AFF",
    primaryDeep: "#0040DD",
    paper: "#FFFFFF",
    paperDeep: "#F2F2F7",
    ink: "#000000",
    inkSoft: "#3C3C43",
    rule: "#C6C6C8",
    success: "#34C759",
    warn: "#FF9500",
    stop: "#FF3B30",
    fontDisplay: "SF Pro Display",
    fontSans: "SF Pro Text",
    fontMono: "SF Mono",
    motion: "snappy" as const,
    logoUrl: "",
    aspectRatios: { instagram: "1080x1920", linkedin: "1920x1080", facebook: "1080x1080" },
  },
  contrastChecks: [
    { fg: "#000000", bg: "#FFFFFF", ratio: 21,    pass: "AAA"  as "AA" | "AAA" | "fail", label: "label on bg" },
    { fg: "#007AFF", bg: "#FFFFFF", ratio: 4.6,   pass: "AA"   as "AA" | "AAA" | "fail", label: "blue on bg" },
  ],
};
