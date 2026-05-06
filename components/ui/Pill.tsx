import { cn } from "@/lib/cn";

const TONE: Record<string, string> = {
  blue:    "bg-blue/12   text-blue",
  green:   "bg-green/14  text-green",
  orange:  "bg-orange/14 text-orange",
  red:     "bg-red/14    text-red",
  purple:  "bg-purple/14 text-purple",
  indigo:  "bg-indigo/14 text-indigo",
  pink:    "bg-pink/14   text-pink",
  gray:    "bg-fill-tertiary text-label-secondary",
  filled:  "bg-label/8   text-label",
};

export function Pill({
  tone = "gray",
  size = "md",
  children,
  className,
  dot = false,
}: {
  tone?: keyof typeof TONE;
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tracking-[-0.004em]",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
        TONE[tone],
        className,
      )}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: "currentColor" }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
