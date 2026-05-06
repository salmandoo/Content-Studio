import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tinted" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-7  px-3   text-[13px] rounded-[8px]",
  md: "h-9  px-3.5 text-[14px] rounded-[10px]",
  lg: "h-11 px-5   text-[15px] rounded-[12px] font-semibold",
};

const VARIANT: Record<Variant, string> = {
  primary:     "bg-blue text-white hover:brightness-110 shadow-[0_0.5px_0_0_oklch(0_0_0/0.08),0_4px_12px_-3px_oklch(0_0_0/0.18)]",
  secondary:   "bg-bg-elev text-label shadow-card hover:bg-fill-quaternary border border-separator",
  tinted:      "bg-blue/12 text-blue hover:bg-blue/18",
  ghost:       "text-blue hover:bg-fill-quaternary",
  destructive: "bg-red text-white hover:brightness-110",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...rest}
      className={cn(
        "pressable inline-flex items-center justify-center gap-1.5 font-medium tracking-[-0.006em] focus-visible:outline-none disabled:opacity-50",
        SIZE[size],
        VARIANT[variant],
        className,
      )}
    />
  );
}
