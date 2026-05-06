export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Toolbar } from "@/components/Toolbar";
import { Card, Group, Row } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { StatusDot } from "@/components/ui/StatusDot";
import { PlatformGlyph } from "@/components/ui/PlatformGlyph";
import { Pencil, RefreshCw, Download, Send } from "lucide-react";
import { isConfigured } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

type Piece = Database["public"]["Tables"]["pieces"]["Row"];
type Run = Database["public"]["Tables"]["runs"]["Row"];

const FORMAT_LABEL: Record<string, string> = {
  long_post: "Long-form post",
  short_post: "Short post",
  carousel: "Carousel",
  reel: "Vertical reel",
  square_video: "Square video",
  landscape_video: "Landscape video",
  article: "Article",
  newsletter: "Newsletter",
};

export default async function PiecePage({
  params,
}: {
  params: Promise<{ id: string; pid: string }>;
}) {
  const { id, pid } = await params;
  if (!isConfigured()) notFound();
  const supabase = await supabaseServer();

  const { data: piece } = await supabase
    .from("pieces")
    .select("*")
    .eq("id", pid)
    .eq("run_id", id)
    .single();
  if (!piece) notFound();

  const { data: run } = await supabase
    .from("runs")
    .select("label")
    .eq("id", id)
    .single<Pick<Run, "label">>();

  const runLabel = run?.label ?? id;

  return (
    <>
      <Toolbar
        title={piece.title ?? "Piece"}
        subtitle={`${runLabel} · ${piece.id.slice(0, 8)}`}
        back={{ href: "/library", label: "Library" }}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Pencil className="size-3.5" strokeWidth={2.2} /> Edit
            </Button>
            <Button variant="secondary" size="sm">
              <RefreshCw className="size-3.5" strokeWidth={2.2} /> Re-run
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="size-3.5" strokeWidth={2.2} /> JSON
            </Button>
            <Button variant="primary" size="sm">
              <Send className="size-3.5" strokeWidth={2.4} /> Mark published
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-[1080px] px-6 py-10 sm:px-8">
        <header className="rise mb-8">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-label-tertiary">
            {FORMAT_LABEL[piece.format] ?? piece.format} · {runLabel}
          </p>
          <h1 className="text-large-title tracking-[-0.022em]">
            {piece.title ?? "Untitled piece"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusDot status={piece.status} size="md" />
            <Pill tone="gray" size="sm">
              <PlatformGlyph platform={piece.platform} size={14} /> {piece.platform}
            </Pill>
            <Pill tone="gray" size="sm">{FORMAT_LABEL[piece.format] ?? piece.format}</Pill>
            {piece.cost_cents !== null && (
              <Pill tone="green" size="sm">${(piece.cost_cents / 100).toFixed(2)}</Pill>
            )}
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <Card>
              {piece.flag_reason && (
                <div className="mb-4 rounded-[10px] bg-orange/10 p-4">
                  <p className="text-[12.5px] font-semibold uppercase tracking-wider text-orange">
                    Held back · compliance
                  </p>
                  <p className="mt-1 text-[14.5px] text-label">{piece.flag_reason}</p>
                </div>
              )}

              {piece.copy && (
                <div>
                  <p className="text-caption-1 uppercase tracking-wider text-label-tertiary">Copy</p>
                  <p className="mt-2 whitespace-pre-line text-body leading-[1.65] text-label">
                    {piece.copy}
                  </p>
                </div>
              )}

              {piece.cta && (
                <div className="mt-5">
                  <Button variant="tinted" size="md">{piece.cta} →</Button>
                </div>
              )}

              {piece.hashtags && piece.hashtags.length > 0 && (
                <p className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-[14px] font-medium text-blue">
                  {piece.hashtags.map((h: string) => <span key={h}>{h}</span>)}
                </p>
              )}

              {piece.slides && Array.isArray(piece.slides) && (
                <div className="mt-6 space-y-3">
                  <p className="text-caption-1 uppercase tracking-wider text-label-tertiary">Slides</p>
                  {(piece.slides as unknown as Array<{ index: number; headline: string; body: string }>).map((s) => (
                    <div key={s.index} className="rounded-[12px] bg-fill-quaternary p-4">
                      <p className="text-[12px] font-mono text-label-tertiary">№ {String(s.index).padStart(2, "0")}</p>
                      <p className="mt-1 text-headline">{s.headline}</p>
                      <p className="mt-1 text-callout text-label-secondary">{s.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {piece.schema_json !== null && piece.schema_json !== undefined && (
              <Card className="mt-6" inset>
                <div className="border-b border-separator px-5 py-3">
                  <p className="text-headline">Schema · JSON</p>
                  <p className="mt-0.5 text-footnote text-label-secondary">
                    Locked output for downstream tools.
                  </p>
                </div>
                <pre className="overflow-x-auto bg-bg-grouped p-5 font-mono text-[12.5px] leading-[1.7] text-label-secondary">
                  <code>{JSON.stringify(piece.schema_json, null, 2)}</code>
                </pre>
              </Card>
            )}
          </div>

          <aside className="col-span-12 space-y-6 lg:col-span-4">
            <Group header="Cost ledger">
              <Row title="Tokens in" trailing={<span className="font-mono num-tabular">{(piece.tokens_in ?? 0).toLocaleString()}</span>} />
              <Row title="Tokens out" trailing={<span className="font-mono num-tabular">{(piece.tokens_out ?? 0).toLocaleString()}</span>} />
              <Row
                title={<span className="font-semibold">Subtotal</span>}
                trailing={<span className="font-mono num-tabular text-label">${((piece.cost_cents ?? 0) / 100).toFixed(2)}</span>}
              />
            </Group>

            <Group header="Lineage">
              <Row title="Run" caption={runLabel} trailing={<span className="font-mono">{id.slice(0, 8)}</span>} />
              <Row title="Generated" trailing={
                <span className="font-mono">
                  {new Date(piece.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              } />
              {piece.approved_at && (
                <Row title="Approved" trailing={
                  <span className="font-mono">
                    {new Date(piece.approved_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                } />
              )}
              {piece.published_at && (
                <Row title="Published" trailing={
                  <span className="font-mono">
                    {new Date(piece.published_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                } />
              )}
            </Group>
          </aside>
        </div>
      </div>
    </>
  );
}
