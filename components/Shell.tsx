import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[oklch(0.92_0.01_265)] dark:bg-[oklch(0.10_0.005_264)] p-3 sm:p-6">
      <div className="mx-auto flex h-[calc(100vh-24px)] max-w-[1480px] overflow-hidden rounded-[18px] bg-bg-grouped shadow-[0_28px_70px_-20px_oklch(0.2_0.025_270/0.40),0_8px_24px_-12px_oklch(0.2_0.025_270/0.30)] ring-1 ring-black/[0.06] sm:h-[calc(100vh-48px)]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <WindowChrome />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}

function WindowChrome() {
  return (
    <div className="material-thick flex items-center gap-3 border-b border-separator px-4 py-2.5 lg:hidden">
      <div className="flex gap-[6px]">
        <span className="size-3 rounded-full bg-[#FF5F57] border border-[#E0443E]/40" />
        <span className="size-3 rounded-full bg-[#FEBC2E] border border-[#DEA123]/40" />
        <span className="size-3 rounded-full bg-[#28C840] border border-[#1AAB29]/40" />
      </div>
      <span className="text-caption-1 font-semibold text-label-secondary">Content Studio</span>
    </div>
  );
}
