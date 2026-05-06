"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Search,
  Sparkles,
  Library,
  Settings,
  ChevronRight,
  CircleHelp,
} from "lucide-react";

const NAV = [
  { href: "/",         icon: Sparkles, title: "Compose",  tint: "blue",   shortcut: "1" },
  { href: "/library",  icon: Library,  title: "Library",  tint: "indigo", shortcut: "2" },
  { href: "/settings", icon: Settings, title: "Settings", tint: "gray",   shortcut: "3" },
];

const TINTS: Record<string, string> = {
  blue:   "bg-blue text-white",
  indigo: "bg-indigo text-white",
  gray:   "bg-fill text-label",
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[244px] shrink-0 flex-col border-r border-separator bg-sidebar lg:flex">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3.5">
        <div className="flex gap-[6px] pr-1">
          <span className="size-3 rounded-full bg-[#FF5F57] border border-[#E0443E]/40" />
          <span className="size-3 rounded-full bg-[#FEBC2E] border border-[#DEA123]/40" />
          <span className="size-3 rounded-full bg-[#28C840] border border-[#1AAB29]/40" />
        </div>
      </div>

      <div className="px-4 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-[8px] bg-gradient-to-br from-blue to-purple text-[14px] font-bold text-white shadow-card">
            C
          </span>
          <div>
            <p className="text-[14px] font-semibold tracking-[-0.012em] text-label">
              Content Studio
            </p>
            <p className="text-[11px] text-label-tertiary">v0.1</p>
          </div>
        </div>
      </div>

      <div className="px-3 pb-2 pt-1">
        <div className="flex items-center gap-2 rounded-[10px] bg-fill-tertiary px-2.5 py-1.5">
          <Search className="size-4 text-label-tertiary" strokeWidth={2.2} />
          <input
            type="search"
            placeholder="Search"
            className="w-full bg-transparent text-[13px] text-label placeholder:text-label-tertiary focus:outline-none"
          />
          <kbd className="rounded-[5px] border border-separator bg-bg-elev/60 px-1.5 py-0.5 text-[10px] text-label-tertiary">
            ⌘K
          </kbd>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-0.5">
          {NAV.map((it) => (
            <NavItem key={it.href} pathname={pathname} {...it} />
          ))}
        </ul>
      </nav>

      <div className="border-t border-separator p-3">
        <button className="pressable flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 hover:bg-fill-quaternary">
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-blue to-purple text-[12px] font-semibold text-white">
            S
          </span>
          <span className="flex-1 truncate text-left text-[12.5px] font-medium text-label">
            Account
          </span>
          <ChevronRight className="size-3.5 text-label-tertiary" strokeWidth={2.4} />
        </button>

        <button className="pressable mt-1 flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-label-secondary hover:bg-fill-quaternary">
          <CircleHelp className="size-4" strokeWidth={2.2} />
          <span className="text-[12.5px] font-medium">Help</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  title,
  tint,
  shortcut,
  pathname,
}: {
  href: string;
  icon: typeof Sparkles;
  title: string;
  tint: string;
  shortcut?: string;
  pathname: string;
}) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors",
          active ? "bg-blue text-white" : "text-label hover:bg-fill-quaternary",
        )}
      >
        <span
          className={cn(
            "grid size-6 place-items-center rounded-[6px] shadow-card",
            active ? "bg-white/20" : TINTS[tint],
          )}
        >
          <Icon
            className={cn("size-3.5", active ? "text-white" : tint === "gray" ? "text-label" : "text-white")}
            strokeWidth={2.2}
          />
        </span>
        <span className="flex-1 text-[13.5px] font-semibold tracking-[-0.006em]">{title}</span>
        {shortcut && (
          <kbd
            className={cn(
              "rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium",
              active
                ? "bg-white/15 text-white/80"
                : "border border-separator bg-bg-elev/60 text-label-tertiary",
            )}
          >
            ⌘{shortcut}
          </kbd>
        )}
      </Link>
    </li>
  );
}
