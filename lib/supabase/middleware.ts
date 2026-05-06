import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Routes that require auth. Everything else is public.
const AUTH_REQUIRED_PATHS = ["/library", "/settings", "/api/briefs", "/api/runs", "/api/pieces", "/api/brand", "/api/upload"];

// Refresh expired sessions on every request and gate protected routes.
// Don't add custom logic between createServerClient() and supabase.auth.getUser()
// or session refresh races with the response.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    // Not configured — let the page render. The page itself will redirect to /auth
    // once the user tries something that requires auth.
    return response;
  }

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet: { name: string; value: string; options?: import('@supabase/ssr').CookieOptions }[]) {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const requiresAuth = AUTH_REQUIRED_PATHS.some((p) => path.startsWith(p));

  if (!user && requiresAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/auth/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
