import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bad, requireUser } from "@/lib/api/auth";
import { startRun } from "@/lib/api/runner";

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

  const { data: brief } = await supabase
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

  const { data: run, error: insertErr } = await supabase
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

  await startRun(run.id);

  return NextResponse.json({ run });
}

export async function GET() {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data, error: qErr } = await supabase
    .from("runs")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50);
  if (qErr) return bad(qErr.message, 500);
  return NextResponse.json({ runs: data ?? [] });
}
