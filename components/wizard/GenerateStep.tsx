"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { PlatformGlyph } from "@/components/ui/PlatformGlyph";
import { api } from "@/lib/api/client";
import { Pause, X } from "lucide-react";
import type { Database, PieceStatus, RunStatus } from "@/lib/supabase/types";

type Run = Database["public"]["Tables"]["runs"]["Row"];
type Piece = Database["public"]["Tables"]["pieces"]["Row"];

const POLL_MS = 1500;
const TERMINAL_RUN: RunStatus[] = ["completed", "failed", "cancelled"];

export function GenerateStep({
  runId,
  onDone,
}: {
  runId: string;
  onDone: () => void;
}) {
  const [run, setRun] = useState<Run | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const data = await api.get<{ run: Run; pieces: Piece[] }>(`/api/runs/${runId}`);
        if (!alive) return;
        setRun(data.run);
        setPieces(data.pieces);
        if (TERMINAL_RUN.includes(data.run.status)) {
          if (data.run.status === "completed") onDone();
          else setError(`Run ${data.run.status}.`);
          return;
        }
        timer = setTimeout(tick, POLL_MS);
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message);
        timer = setTimeout(tick, POLL_MS * 2);
      }
    }
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [runId, paused, onDone]);

  const total = run?.total ?? 0;
  const done = run?.done ?? 0;
  const overall = total === 0 ? 0 : (pieces.filter((p) => isTerminalPiece(p.status)).length / total) * 100;
  const allDone = total > 0 && done + (run?.failed ?? 0) + (run?.flagged ?? 0) >= total;

  return (
    <div className="space-y-6">
      <Card className="rise flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Donut pct={overall} done={allDone} />
          <div>
            <h2 className="text-title-2">
              {allDone ? "All set." : "We're on it."}{" "}
              {!allDone && total > 0 && (
                <span className="text-label-secondary">
                  <span className="font-semibold text-blue num-tabular">{done}</span>{" "}
                  of {total} done
                </span>
              )}
            </h2>
            <p className="mt-1 max-w-[60ch] text-callout text-label-secondary">
              {allDone
                ? "Review the pieces below before publishing."
                : run?.status === "queued"
                ? "Spinning up workers — first pieces appear in a moment."
                : "Writing copy in parallel. Step away — we'll keep working."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!allDone ? (
            <>
              <Button variant="secondary" size="md" onClick={() => setPaused((p) => !p)}>
                <Pause className="size-3.5" strokeWidth={2.2} /> {paused ? "Resume" : "Pause"}
              </Button>
              <Button variant="ghost" size="md">
                <X className="size-3.5" strokeWidth={2.4} /> Cancel
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" onClick={onDone}>
              Open review →
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <div className="rounded-[14px] border border-red/30 bg-red/8 px-5 py-3 text-[13.5px] font-medium text-red">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pieces.length === 0 && total === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[16px] bg-card-grouped p-5 shadow-card">
              <div className="h-3 w-1/3 rounded-full bg-fill-tertiary" />
              <div className="mt-3 h-4 w-2/3 rounded-full bg-fill-tertiary" />
              <div className="mt-4 h-1.5 w-full rounded-full bg-fill-tertiary" />
            </div>
          ))
        ) : (
          pieces.map((p, i) => <JobCard key={p.id} piece={p} index={i} />)
        )}
      </div>
    </div>
  );
}

function isTerminalPiece(s: PieceStatus) {
  return s === "ready" || s === "flagged" || s === "failed";
}

function JobCard({ piece, index }: { piece: Piece; index: number }) {
  const STATE_TONE: Record<PieceStatus, "gray" | "blue" | "orange" | "green" | "red"> = {
    queued: "gray",
    writing: "blue",
    rendering: "orange",
    ready: "green",
    flagged: "orange",
    failed: "red",
    approved: "green",
    rejected: "gray",
    review: "orange",
    published: "green",
  };
  const STATE_LABEL: Record<PieceStatus, string> = {
    queued: "Queued",
    writing: "Writing",
    rendering: "Rendering",
    ready: "Ready",
    flagged: "Flagged",
    failed: "Failed",
    approved: "Approved",
    rejected: "Rejected",
    review: "Review",
    published: "Published",
  };
  const isDone = isTerminalPiece(piece.status);
  const inflight = piece.status === "writing" || piece.status === "rendering";
  const pct =
    piece.status === "ready" || piece.status === "flagged"
      ? 100
      : piece.status === "rendering"
      ? 70
      : piece.status === "writing"
      ? 35
      : 5;

  return (
    <div
      className={cn(
        "rise relative overflow-hidden rounded-[16px] bg-card-grouped p-4 shadow-card transition-all",
        isDone && "ring-1 ring-blue/20",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <PlatformGlyph platform={piece.platform} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-label">
            {piece.title ?? capitalize(piece.format.replace(/_/g, " "))}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-label-secondary capitalize">
            {piece.format.replace(/_/g, " ")}
          </p>
        </div>
        <Pill tone={STATE_TONE[piece.status]} size="sm" dot>
          {STATE_LABEL[piece.status]}
        </Pill>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-fill-tertiary">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            piece.status === "flagged" || piece.status === "failed" ? "bg-orange" : "bg-blue",
            inflight && "live-pulse",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-label-tertiary num-tabular">
        <span>{piece.id.slice(0, 8)}</span>
        <span>{pct}%</span>
      </div>

      {piece.flag_reason && (
        <p className="mt-2 line-clamp-2 text-[11.5px] text-orange">{piece.flag_reason}</p>
      )}

      {inflight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 8px)",
          }}
        />
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Donut({ pct, done }: { pct: number; done: boolean }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div className="relative grid size-20 place-items-center">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} stroke="var(--color-fill-tertiary)" strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke={done ? "var(--color-green)" : "var(--color-blue)"}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 240ms ease, stroke 240ms ease" }}
        />
      </svg>
      <span className="absolute text-[18px] font-bold tracking-[-0.012em] text-label num-tabular">
        {done ? "✓" : `${Math.round(pct)}%`}
      </span>
    </div>
  );
}
