"use client";

import { useState } from "react";
import { Toolbar } from "@/components/Toolbar";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { UploadStep } from "@/components/wizard/UploadStep";
import { GenerateStep } from "@/components/wizard/GenerateStep";
import { ApproveStep } from "@/components/wizard/ApproveStep";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, X } from "lucide-react";
import type { WizardStep } from "@/lib/wizard";

export default function ComposePage() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [runId, setRunId] = useState<string | null>(null);
  const [demoPieces, setDemoPieces] = useState<unknown[] | null>(null);

  const reset = () => {
    setStep("upload");
    setRunId(null);
    setDemoPieces(null);
  };

  return (
    <>
      <Toolbar
        title={
          step === "upload" ? "New Brief"
          : step === "generating" ? "Working on it"
          : step === "approve" ? "Review & approve"
          : "Published"
        }
        subtitle={
          step === "upload" ? "Step 1 of 3 · Compose"
          : step === "generating" ? "Step 2 of 3 · Generating"
          : step === "approve" ? "Step 3 of 3 · Approve"
          : "All set"
        }
        actions={
          step !== "upload" ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="size-3.5" strokeWidth={2.4} /> Cancel run
            </Button>
          ) : null
        }
      />

      <div className="mx-auto max-w-[1080px] px-6 py-8 sm:px-8">
        <StepIndicator step={step} onStepClick={setStep} />

        <div className="mt-8">
          {step === "upload" && (
            <UploadStep
              onRun={(rid, pieces) => {
                setRunId(rid);
                if (pieces) {
                  setDemoPieces(pieces);
                  setStep("approve"); // demo is synchronous — skip generating screen
                } else {
                  setStep("generating");
                }
              }}
            />
          )}
          {step === "generating" && runId && (
            <GenerateStep runId={runId} onDone={() => setStep("approve")} />
          )}
          {step === "approve" && (runId || demoPieces) && (
            <ApproveStep
              runId={runId ?? ""}
              demoPieces={demoPieces ?? undefined}
              onPublish={() => setStep("published")}
              onBack={reset}
            />
          )}
          {step === "published" && (
            <PublishedScreen onNew={reset} />
          )}
        </div>
      </div>
    </>
  );
}

function PublishedScreen({ onNew }: { onNew: () => void }) {
  return (
    <div className="rise rounded-[22px] bg-card-grouped p-12 text-center shadow-card">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-green/14 text-green">
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
          <path
            d="M9 17l5.5 5.5L25 12"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <h2 className="mt-5 text-large-title">Approved.</h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-body text-label-secondary">
        Your approved pieces are saved. The scheduler integration is Phase 5 — for now, copy what you need from the library.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="primary" size="lg" onClick={onNew}>
          <ArrowLeft className="size-4" strokeWidth={2.4} /> New brief
        </Button>
        <a
          href="/library"
          className="pressable inline-flex h-11 items-center rounded-[12px] bg-bg-elev px-5 text-[15px] font-semibold text-label shadow-card hover:bg-fill-quaternary"
        >
          Open library
        </a>
      </div>
    </div>
  );
}
