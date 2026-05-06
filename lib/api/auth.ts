import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { user, supabase, error: null } as const;
}

export function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
