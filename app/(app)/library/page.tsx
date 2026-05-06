export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Toolbar, PageHeader } from "@/components/Toolbar";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { ChevronRight, FileText, Plus, Sparkles, Table2 } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type Run = Database["public"]["Tables"]["runs"]["Row"];

const SOURCE_ICON = {
  prompt: { icon: Sparkles, tint: "bg-blue" },
  pdf:    { icon: FileText, tint: "bg-orange" },
  excel:  { icon: Table2,   tint: "bg-green" },
};

import { isConfigured } from "@/lib/env";

export default async function LibraryPage() {
  if (!isConfigured()) {
    return <NotConfigured />;
  }
  const supabase = await supabaseServer();
  const { data: runs } = await supabase
    .from("runs")
    .select("*, briefs!inner(source)")
    .order("started_at", { ascending: false })
    .limit(50);

  const list = (runs ?? []) as (Run & { briefs: { source: "prompt" | "pdf" | "excel" } })[];
  const totalToday = list.reduce((a, r) => a + r.total, 0);
  const doneToday = list.reduce((a, r) => a + r.done, 0);
  const costToday = list.reduce((a, r) => a + r.cost_cents, 0);

  return (
    <>
      <Toolbar
        title="Library"
        subtitle={`${list.length} runs`}
        actions={
          <Link href="/">
            <Button variant="primary" size="sm">
              <Plus className="size-3.5" strokeWidth={2.4} /> New brief
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-[1280px] px-6 py-10 sm:px-8">
        <PageHeader
          eyebrow="Today"
          title={
            <>
              <span className="text-blue">{list.length}</span>{" "}
              run{list.length === 1 ? "" : "s"} on the press.
            </>
          }
          subtitle="Approved pieces are saved here. Open any run to see its manifest."
          right={
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label="Pieces" value={totalToday.toString()} />
              <Stat label="Closed" value={doneToday.toString()} />
              <Stat label="Cost" value={`$${(costToday / 100).toFixed(2)}`} accent />
            </div>
          }
        />

        {list.length === 0 ? (
          <Empty />
        ) : (
          <Card inset>
            <ul>
              {list.map((r) => (
                <RunRow key={r.id} r={r} />
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

function RunRow({
  r,
}: {
  r: Run & { briefs: { source: "prompt" | "pdf" | "excel" } };
}) {
  const { icon: Icon, tint } = SOURCE_ICON[r.briefs.source];
  const pct = r.total === 0 ? 0 : (r.done / r.total) * 100;
  const seg = (n: number) => `${r.total === 0 ? 0 : (n / r.total) * 100}%`;

  return (
    <li className="relative">
      <Link
        href={`/library/${r.id}`}
        className="grid grid-cols-12 items-center gap-4 px-5 py-4 transition-colors hover:bg-fill-quaternary hairline-b"
      >
        <span className={`col-span-1 inline-grid size-9 place-items-center rounded-[10px] text-white shadow-card ${tint}`}>
          <Icon className="size-4" strokeWidth={2.2} />
        </span>

        <div className="col-span-12 min-w-0 sm:col-span-5 lg:col-span-5">
          <p className="truncate text-[15.5px] font-semibold tracking-[-0.012em] text-label">
            {r.label ?? "Run"}
          </p>
          <p className="mt-0.5 truncate font-mono text-[12.5px] text-label-secondary">
            {r.id.slice(0, 8)}
          </p>
        </div>

        <div className="col-span-6 sm:col-span-2 lg:col-span-2">
          <p className="text-[12px] uppercase tracking-[0.04em] text-label-tertiary">Started</p>
          <p className="text-[13.5px] font-medium tabular-nums text-label">
            {new Date(r.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <div className="col-span-6 sm:col-span-3 lg:col-span-3">
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-fill-tertiary">
              <div className="bg-blue" style={{ width: seg(r.done) }} />
              <div className="bg-yellow" style={{ width: seg(r.flagged) }} />
              <div className="bg-red" style={{ width: seg(r.failed) }} />
            </div>
            <span className="text-[12.5px] font-semibold tabular-nums text-label">
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11.5px] text-label-tertiary">
            <span className="num-tabular text-label-secondary">
              {r.done}/{r.total} done
            </span>
            {r.flagged > 0 && <span className="text-yellow">· {r.flagged} flagged</span>}
            {r.failed > 0 && <span className="text-red">· {r.failed} failed</span>}
          </div>
        </div>

        <div className="col-span-12 flex items-center justify-end gap-2 sm:col-span-1 lg:col-span-1">
          {r.status === "completed" && r.failed === 0 ? (
            <Pill tone="green" size="sm" dot>Closed</Pill>
          ) : r.status === "running" ? (
            <Pill tone="orange" size="sm" dot>Live</Pill>
          ) : r.failed > 0 ? (
            <Pill tone="red" size="sm" dot>Issues</Pill>
          ) : (
            <Pill tone="blue" size="sm" dot>{r.status}</Pill>
          )}
          <ChevronRight className="size-4 text-label-tertiary" strokeWidth={2.4} />
        </div>
      </Link>
    </li>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[12px] bg-card-grouped px-3.5 py-2.5 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-label-tertiary">
        {label}
      </p>
      <p
        className={`mt-0.5 text-title-2 font-semibold tracking-[-0.018em] num-tabular ${
          accent ? "text-blue" : "text-label"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-20 text-center">
      <h1 className="text-large-title">Supabase not configured.</h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-body text-label-secondary">
        Set <span className="font-mono text-label">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
        <span className="font-mono text-label">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> in <span className="font-mono text-label">.env.local</span>, then restart the dev server. See README.md §2.
      </p>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-[22px] bg-card-grouped p-12 text-center shadow-card">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-blue/12 text-blue">
        <Sparkles className="size-6" strokeWidth={2.2} />
      </div>
      <h2 className="mt-4 text-title-2">No runs yet.</h2>
      <p className="mx-auto mt-1 max-w-[40ch] text-body text-label-secondary">
        Start a brief on the Compose tab — your first run will appear here.
      </p>
      <Link href="/">
        <Button variant="primary" size="lg" className="mt-5">
          <Plus className="size-4" strokeWidth={2.4} /> New brief
        </Button>
      </Link>
    </div>
  );
}
