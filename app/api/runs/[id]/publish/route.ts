import { NextResponse } from "next/server";
import { bad, requireUser } from "@/lib/api/auth";

// Phase 1: "publish" marks approved pieces as published. There is no
// downstream scheduler integration yet — that's Phase 5 of the PRD.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data, error: upErr } = await supabase
    .from("pieces")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("run_id", id)
    .eq("user_id", user.id)
    .eq("status", "approved")
    .select();
  if (upErr) return bad(upErr.message, 500);

  return NextResponse.json({ published: data?.length ?? 0 });
}
