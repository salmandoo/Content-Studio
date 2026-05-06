import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { bad, requireUser } from "@/lib/api/auth";
import { runOne } from "@/lib/api/runner";

export const maxDuration = 300;

const Body = z.object({
  briefId: z.string().uuid(),
  label: z.string().max(140).optional(),
});

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return bad(`Invalid request body: ${(e as Error).message}`);
  }

  const { data: brief } = await (supabase as any)
    .from("briefs")
    .select("id, prompt, source, file_name")
    .eq("id", body.briefId)
    .eq("user_id", user.id)
    .single();
  if (!brief) return bad("Brief not found.", 404);

  const label =
    body.label ??
    (brief.prompt
      ? brief.prompt.split("\n")[0].slice(0, 80)
      : brief.file_name
      ? `From ${brief.file_name}`
      : `Run · ${new Date().toISOString().slice(0, 10)}`);

  const { data: run, error: insertErr } = await (supabase as any)
    .from("runs")
    .insert({
      brief_id: brief.id,
      user_id: user.id,
      label,
      status: "queued",
    })
    .select()
    .single();
  if (insertErr || !run) return bad(insertErr?.message ?? "Failed to create run.", 500);

  // after() keeps the serverless function alive until the runner finishes.
  // Without it, "fire and forget" gets killed the moment the response returns
  // and the run stays queued forever.
  after(async () => {
    try {
      await runOne(run.id);
    } catch (err) {
      console.error("[runner] run failed", run.id, err);
    }
  });

  return NextResponse.json({ run });
}

export async function GET() {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data, error: qErr } = await (supabase as any)
    .from("runs")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50);
  if (qErr) return bad(qErr.message, 500);
  return NextResponse.json({ runs: data ?? [] });
}
