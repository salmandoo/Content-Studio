import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bad, requireUser } from "@/lib/api/auth";
import type { Database } from "@/lib/supabase/types";

const Body = z.object({
  verdict: z.enum(["approved", "rejected", "review"]),
});

type PieceUpdate = Database["public"]["Tables"]["pieces"]["Update"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return bad(`Invalid request body: ${(e as Error).message}`);
  }

  const update: PieceUpdate = { status: body.verdict };
  if (body.verdict === "approved") update.approved_at = new Date().toISOString();

  const { data, error: upErr } = await supabase
    .from("pieces")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (upErr || !data) return bad(upErr?.message ?? "Update failed.", 500);
  return NextResponse.json({ piece: data });
}
