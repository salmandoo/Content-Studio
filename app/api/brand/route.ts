import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bad, requireUser } from "@/lib/api/auth";
import type { Database, Json } from "@/lib/supabase/types";

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  voice_md: z.string().max(80_000).optional(),
  visual_md: z.string().max(80_000).optional(),
  tokens: z.record(z.unknown()).optional(),
  design_system: z.string().max(64).optional(),
  motion_preference: z.enum(["snappy", "cinematic"]).optional(),
});

type BrandUpdate = Database["public"]["Tables"]["brand_settings"]["Update"];

export async function GET() {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data, error: qErr } = await supabase
    .from("brand_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (qErr || !data) return bad(qErr?.message ?? "Brand settings not found.", 404);
  return NextResponse.json({ brand: data });
}

export async function PATCH(req: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return bad(`Invalid request body: ${(e as Error).message}`);
  }

  const update: BrandUpdate = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.voice_md !== undefined) update.voice_md = body.voice_md;
  if (body.visual_md !== undefined) update.visual_md = body.visual_md;
  if (body.tokens !== undefined) update.tokens = body.tokens as Json;
  if (body.design_system !== undefined) update.design_system = body.design_system;
  if (body.motion_preference !== undefined) update.motion_preference = body.motion_preference;

  const { data, error: upErr } = await supabase
    .from("brand_settings")
    .update(update)
    .eq("user_id", user.id)
    .select()
    .single();
  if (upErr || !data) return bad(upErr?.message ?? "Update failed.", 500);
  return NextResponse.json({ brand: data });
}
