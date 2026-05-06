"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Group, Row } from "@/components/ui/Card";
import { Card } from "@/components/ui/Card";
import { PlatformGlyph } from "@/components/ui/PlatformGlyph";
import { api } from "@/lib/api/client";
import {
  ArrowRight,
  FileText,
  Sparkles,
  Table2,
  Upload,
  X,
  CircleDollarSign,
  Clock,
} from "lucide-react";
import type { Platform, Format } from "@/lib/supabase/types";

type Source = "prompt" | "pdf" | "excel";
type AttachedFile = { name: string; size: number; kind: "pdf" | "excel"; path?: string };

const CHANNELS: { key: Platform; label: string; format: Format }[] = [
  { key: "linkedin",  label: "LinkedIn",  format: "long_post"  },
  { key: "instagram", label: "Instagram", format: "carousel"   },
  { key: "facebook",  label: "Facebook",  format: "short_post" },
  { key: "blog",      label: "Blog",      format: "article"    },
];

export function UploadStep({ onRun }: { onRun: (runId: string, demoPieces?: unknown[]) => void }) {
  const [source, setSource] = useState<Source>("prompt");
  const [val, setVal] = useState("");
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [drag, setDrag] = useState(false);
  const [picked, setPicked] = useState<Set<Platform>>(
    new Set<Platform>(["linkedin", "instagram", "facebook", "blog"]),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    const isPdf = f.name.toLowerCase().endsWith(".pdf");
    const kind = isPdf ? "pdf" : "excel";
    setError(null);
    setAttached({ name: f.name, size: f.size, kind });
    setSource(kind);
  }

  function togglePlatform(p: Platform) {
    setPicked((s) => {
      const n = new Set(s);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
  }

  const totalPieces = CHANNELS.filter((c) => picked.has(c.key)).length;

  async function handleRun() {
    setError(null);
    setSubmitting(true);
    try {
      const channels = Array.from(picked);
      const formats = Array.from(
        new Set(CHANNELS.filter((c) => picked.has(c.key)).map((c) => c.format)),
      ) as Format[];

      // Try the full pipeline first; fall back to demo mode if unauthorized.
      const briefBody = {
        source,
        prompt: source === "prompt" ? val : null,
        filePath: attached?.path ?? null,
        fileName: attached?.name ?? null,
        channels,
        formats,
      };

      try {
        const { brief } = await api.post<{ brief: { id: string } }>("/api/briefs", briefBody);
        const { run } = await api.post<{ run: { id: string } }>("/api/runs", {
          briefId: brief.id,
          label: source === "prompt" ? val.split("\n")[0].slice(0, 80) : `From ${attached?.name}`,
        });
        onRun(run.id);
      } catch (authErr) {
        const msg = (authErr as Error).message;
        if (/unauthorized|missing|configured/i.test(msg)) {
          // Demo mode — generate inline without auth/DB.
          const { pieces } = await api.post<{ pieces: unknown[] }>("/api/demo/run", {
            prompt: val,
            channels,
            formats,
            brand: { name: "Studio", voice_md: "", visual_md: "" },
          });
          onRun(`demo-${Date.now()}`, pieces);
        } else {
          throw authErr;
        }
      }
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  const canRun =
    !submitting &&
    picked.size > 0 &&
    ((source === "prompt" && val.trim().length >= 4) ||
      ((source === "pdf" || source === "excel") && attached));

  return (
    <div className="space-y-6">
      <div className="rise mb-2">
        <h1 className="text-large-title tracking-[-0.022em]">
          What should we <span className="text-blue">make</span>?
        </h1>
        <p className="mt-2 max-w-[60ch] text-body text-label-secondary">
          Hand the studio a prompt or a PDF. The studio reads it, writes it,
          and brings it back for your approval.
        </p>
      </div>

      {error && (
        <div className="rounded-[14px] border border-red/30 bg-red/8 px-5 py-3 text-[13.5px] font-medium text-red">
          {error}
        </div>
      )}

      <Card inset className="rise rise-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-separator bg-bg-grouped px-4 py-2.5">
          <div className="segmented">
            <button
              aria-selected={source === "prompt"}
              onClick={() => setSource("prompt")}
              className="!gap-1.5"
            >
              <Sparkles className="size-3.5" strokeWidth={2.4} /> Prompt
            </button>
            <button
              aria-selected={source === "pdf"}
              onClick={() => setSource("pdf")}
              className="!gap-1.5"
            >
              <FileText className="size-3.5" strokeWidth={2.4} /> PDF
            </button>
            <button
              aria-selected={source === "excel"}
              onClick={() => setSource("excel")}
              className="!gap-1.5"
              disabled
              title="Excel ingestion is Phase 2"
            >
              <Table2 className="size-3.5" strokeWidth={2.4} /> Excel
            </button>
          </div>
          <span className="text-[11.5px] font-mono text-label-tertiary num-tabular">
            {val.length.toLocaleString()} / 10,000
          </span>
        </div>

        {source === "prompt" ? (
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            spellCheck={false}
            rows={7}
            placeholder="Describe what you want the studio to make. One sentence is enough."
            className="block w-full resize-none bg-card-grouped px-5 py-5 text-body leading-[1.55] text-label placeholder:text-label-tertiary focus:outline-none"
          />
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "relative m-3 grid place-items-center rounded-[14px] border-2 border-dashed py-10 text-center transition-colors",
              drag ? "border-blue bg-blue/8" : "border-separator bg-bg-grouped hover:bg-fill-quaternary",
            )}
          >
            {attached ? (
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-[12px] bg-blue/12 text-blue">
                  {attached.kind === "pdf" ? (
                    <FileText className="size-5" strokeWidth={2.2} />
                  ) : (
                    <Table2 className="size-5" strokeWidth={2.2} />
                  )}
                </span>
                <div className="text-left">
                  <p className="text-[15px] font-semibold text-label">{attached.name}</p>
                  <p className="text-footnote text-label-secondary">
                    {(attached.size / 1024).toFixed(1)} KB · attached
                  </p>
                </div>
                <button
                  onClick={() => setAttached(null)}
                  className="pressable ml-3 grid size-8 place-items-center rounded-full bg-fill-tertiary text-label-secondary hover:bg-fill-secondary"
                  aria-label="Remove"
                >
                  <X className="size-4" strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-[12px] bg-blue/12 text-blue">
                  <Upload className="size-5" strokeWidth={2.2} />
                </span>
                <p className="mt-3 text-[15.5px] font-semibold text-label">
                  Drop a {source === "pdf" ? "PDF" : "spreadsheet"} here
                </p>
                <p className="mt-0.5 text-footnote text-label-secondary">
                  {source === "pdf"
                    ? "Up to 50 MB · 200 pages · Claude reads it directly"
                    : "Phase 2"}
                </p>
                <Button
                  variant="tinted"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileRef.current?.click()}
                >
                  Choose file
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept={source === "pdf" ? ".pdf" : ".csv,.xlsx,.xls"}
                  hidden
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </>
            )}
          </div>
        )}
      </Card>

      <div className="rise rise-2">
        <h2 className="mb-3 text-title-3">Channels</h2>
        <Group>
          {CHANNELS.map((c) => {
            const on = picked.has(c.key);
            return (
              <Row
                key={c.key}
                leading={<PlatformGlyph platform={c.key} size={32} />}
                title={c.label}
                caption={c.format.replace(/_/g, " ")}
                trailing={
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => togglePlatform(c.key)}
                    className="ios-switch"
                  />
                }
              />
            );
          })}
        </Group>
      </div>

      <Card className="rise rise-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Estimate icon={<CircleDollarSign className="size-4" strokeWidth={2.2} />} tone="blue"   label="Estimated cost" value={`$${(totalPieces * 0.6).toFixed(2)}`} />
          <Estimate icon={<Clock           className="size-4" strokeWidth={2.2} />} tone="indigo" label="Wall-clock"     value={`~${Math.max(1, Math.ceil(totalPieces / 3))} min`} />
          <Estimate icon={<Sparkles        className="size-4" strokeWidth={2.2} />} tone="purple" label="Pieces"         value={`${totalPieces}`} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="lg" onClick={handleRun} disabled={!canRun}>
            {submitting ? "Working…" : "Generate"}
            {!submitting && <ArrowRight className="size-4" strokeWidth={2.4} />}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Estimate({
  icon, tone, label, value,
}: {
  icon: React.ReactNode;
  tone: "blue" | "indigo" | "purple";
  label: string;
  value: string;
}) {
  const TONE: Record<string, string> = {
    blue:   "bg-blue/12 text-blue",
    indigo: "bg-indigo/14 text-indigo",
    purple: "bg-purple/14 text-purple",
  };
  return (
    <div className="flex items-center gap-3">
      <span className={`grid size-9 place-items-center rounded-[10px] ${TONE[tone]}`}>{icon}</span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-label-tertiary">
          {label}
        </p>
        <p className="text-[18px] font-semibold tracking-[-0.012em] text-label num-tabular">
          {value}
        </p>
      </div>
    </div>
  );
}
