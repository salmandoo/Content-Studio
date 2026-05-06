import { Shell } from "@/components/Shell";

// No auth gate — the home wizard runs in demo mode without login.
// Library and Settings handle missing auth gracefully on their own.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
