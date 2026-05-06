export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";
import { Toolbar } from "@/components/Toolbar";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { StatusDot } from "@/components/ui/StatusDot";
import { PlatformGlyph } from "@/components/ui/PlatformGlyph";
import { ChevronRight } from "lucide-react";

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

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isConfigured()) notFound();
  const supabase = await supabaseServer();

  const { data: run } = await supabase
    .from("runs")
    .select("*")
    .eq("id", id)
    .single();
  if (!run) notFound();

  const { data: pieces } = await supabase
    .from("pieces")
    .select("*")
    .eq("run_id", id)
    .order("generated_at", { ascending: true });

  const list = pieces ?? [];

  return (
    <>
      <Toolbar
        title={run.label ?? "Run"}
        subtitle={`${id.slice(0, 8)} · ${list.length} piece${list.length === 1 ? "" : "s"}`}
        back={{ href: "/library", label: "Library" }}
      />

      <div className="mx-auto max-w-[1080px] px-6 py-10 sm:px-8">
        <header className="rise mb-8">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-label-tertiary">
            Run
          </p>
          <h1 className="text-large-title tracking-[-0.022em]">
            {run.label ?? "Untitled run"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone={run.status === "completed" ? "green" : run.status === "failed" ? "red" : "blue"} size="sm" dot>
              {run.status}
            </Pill>
            <Pill tone="gray" size="sm">
              {run.done}/{run.total} done
            </Pill>
            {run.cost_cents > 0 && (
              <Pill tone="green" size="sm">
                ${(run.cost_cents / 100).toFixed(2)}
              </Pill>
            )}
          </div>
        </header>

        {list.length === 0 ? (
          <Card className="text-center text-label-secondary">
            No pieces in this run yet.
          </Card>
        ) : (
          <Card inset>
            <ul>
              {list.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/library/${id}/${p.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-fill-quaternary hairline-b"
                  >
                    <PlatformGlyph platform={p.platform} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold tracking-[-0.008em] text-label">
                        {p.title ?? "Untitled"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[12.5px] text-label-secondary">
                        {p.excerpt ?? p.flag_reason ?? FORMAT_LABEL[p.format]}
                      </p>
                      <p className="mt-1 text-[11.5px] text-label-tertiary">
                        <span className="font-mono">{p.id.slice(0, 8)}</span>
                        <span className="mx-1.5">·</span>
                        {FORMAT_LABEL[p.format]}
                        {p.cost_cents !== null && (
                          <>
                            <span className="mx-1.5">·</span>
                            ${(p.cost_cents / 100).toFixed(2)}
                          </>
                        )}
                      </p>
                    </div>
                    <StatusDot status={p.status} />
                    <ChevronRight className="size-4 text-label-tertiary" strokeWidth={2.4} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
