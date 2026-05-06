"use client";

import { cn } from "@/lib/cn";
import { Check } from "lucide-react";
import { WizardStep } from "@/lib/wizard";

const STEPS: { key: WizardStep; n: number; title: string; sub: string }[] = [
  { key: "upload",     n: 1, title: "Compose",  sub: "Upload a brief" },
  { key: "generating", n: 2, title: "Generate", sub: "Studio does the work" },
  { key: "approve",    n: 3, title: "Approve",  sub: "Review & publish" },
];

export function StepIndicator({
  step,
  onStepClick,
}: {
  step: WizardStep;
  onStepClick: (s: WizardStep) => void;
}) {
  const idx = step === "published" ? 3 : STEPS.findIndex((s) => s.key === step);

  return (
    <ol className="flex items-stretch justify-between gap-3 rounded-[18px] bg-card-grouped p-2 shadow-card">
      {STEPS.map((s, i) => {
        const state: "done" | "active" | "todo" = i < idx ? "done" : i === idx ? "active" : "todo";
        const clickable = state === "done" || state === "active";
        return (
          <li key={s.key} className="flex-1">
            <button
              type="button"
              onClick={() => clickable && onStepClick(s.key)}
              disabled={!clickable}
              className={cn(
                "pressable group flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-colors",
                state === "active" && "bg-blue text-white shadow-card",
                state === "done"   && "text-label hover:bg-fill-quaternary",
                state === "todo"   && "cursor-not-allowed text-label-tertiary",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold",
                  state === "active" && "bg-white text-blue",
                  state === "done"   && "bg-green text-white",
                  state === "todo"   && "bg-fill-tertiary text-label-tertiary",
                )}
              >
                {state === "done" ? <Check className="size-4" strokeWidth={3} /> : s.n}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[14px] font-semibold tracking-[-0.008em]",
                    state === "active" ? "text-white" : state === "done" ? "text-label" : "text-label-tertiary",
                  )}
                >
                  {s.title}
                </p>
                <p
                  className={cn(
                    "truncate text-[12px]",
                    state === "active" ? "text-white/80" : "text-label-secondary",
                  )}
                >
                  {s.sub}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
