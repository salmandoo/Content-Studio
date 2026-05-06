import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in · Content Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center bg-bg-grouped p-6">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[22px] bg-card-grouped shadow-[0_28px_70px_-20px_oklch(0.2_0.025_270/0.40)] ring-1 ring-black/[0.06]">
        <div className="border-b border-separator px-6 pb-5 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[10px] bg-gradient-to-br from-blue to-purple text-[16px] font-bold text-white shadow-card">
              C
            </span>
            <div>
              <p className="text-[16px] font-semibold tracking-[-0.012em] text-label">
                Content Studio
              </p>
              <p className="text-[12px] text-label-tertiary">Sign in to continue</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <LoginForm next={sp.next} error={sp.error} />
        </div>
        <div className="border-t border-separator bg-bg-grouped px-6 py-3">
          <p className="text-[11.5px] text-label-tertiary">
            By continuing you agree to the studio's terms.
            We use a magic link — no passwords.
          </p>
        </div>
      </div>
    </div>
  );
}
