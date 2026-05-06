// Tiny client-side fetch helpers — keeps wizard components readable.

export type ApiError = { error: string };

async function go<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try {
      const body = (await r.json()) as ApiError;
      if (body?.error) msg = body.error;
    } catch {
      /* non-JSON body — likely auth redirect to login HTML */
    }
    if (r.status === 401) msg = "Unauthorized";
    throw new Error(msg);
  }
  // If we somehow got HTML on a 200 (shouldn't happen, but be defensive)
  const ct = r.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error("Unauthorized");
  }
  return (await r.json()) as T;
}

export const api = {
  get: <T>(url: string) => go<T>(url),
  post: <T>(url: string, body?: unknown) =>
    go<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    go<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(url: string) => go<T>(url, { method: "DELETE" }),
};
