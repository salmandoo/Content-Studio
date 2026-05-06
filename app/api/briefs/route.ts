import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bad, requireUser } from "@/lib/api/auth";
import type { Format, Platform } from "@/lib/supabase/types";

const PLATFORMS = ["linkedin", "instagram", "facebook", "blog"] as const;
const FORMATS = [
  "long_post", "short_post", "carousel", "article", "newsletter",
  "reel", "square_video", "landscape_video",
] as const;

const Body = z.object({
  source: z.enum(["prompt", "pdf", "excel"]),
  prompt: z.string().max(10_000).nullable().optional(),
  filePath: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  channels: z.array(z.enum(PLATFORMS)).min(1),
  formats: z.array(z.enum(FORMATS)).min(1),
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

  if (body.source === "prompt" && (!body.prompt || body.prompt.trim().length < 4)) {
    return bad("Prompt is too short.");
  }
  if ((body.source === "pdf" || body.source === "excel") && !body.filePath) {
    return bad("filePath is required for pdf/excel briefs.");
  }

  const { data, error: insertErr } = await supabase
    .from("briefs")
    .insert({
      user_id: user.id,
      source: body.source,
      prompt: body.prompt ?? null,
      file_path: body.filePath ?? null,
      file_name: body.fileName ?? null,
      channels: body.channels as Platform[],
      formats: body.formats as Format[],
    })
    .select()
    .single();

  if (insertErr || !data) {
    return bad(insertErr?.message ?? "Failed to create brief.", 500);
  }
  return NextResponse.json({ brief: data });
}
