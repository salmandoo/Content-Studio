import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { bad, requireUser } from "@/lib/api/auth";

const Body = z.object({
  fileName: z.string().min(1).max(256),
  contentType: z.string().min(1).max(120),
  size: z.number().int().min(1).max(50 * 1024 * 1024), // 50 MB
});

// Returns a short-lived signed upload URL the browser can PUT to. Client uploads
// directly to Supabase Storage — the server sees only the metadata.
export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return bad(`Invalid request body: ${(e as Error).message}`);
  }

  const safeName = body.fileName.replace(/[^\w.\-]+/g, "_").slice(0, 200);
  const briefId = randomUUID();
  const path = `${user.id}/${briefId}/${safeName}`;

  const { data, error: signErr } = await supabase
    .storage
    .from("briefs")
    .createSignedUploadUrl(path);

  if (signErr || !data) return bad(signErr?.message ?? "Could not sign upload.", 500);

  return NextResponse.json({
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    fileName: safeName,
  });
}
