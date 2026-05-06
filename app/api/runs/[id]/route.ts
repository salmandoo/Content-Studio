import { NextResponse } from "next/server";
import { bad, requireUser } from "@/lib/api/auth";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data: run, error: runErr } = await supabase
    .from("runs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (runErr || !run) return bad("Run not found.", 404);

  const { data: pieces, error: piecesErr } = await supabase
    .from("pieces")
    .select("*")
    .eq("run_id", id)
    .order("generated_at", { ascending: true });
  if (piecesErr) return bad(piecesErr.message, 500);

  return NextResponse.json({ run, pieces: pieces ?? [] });
}
