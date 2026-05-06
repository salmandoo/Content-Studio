import { Platform } from "@/lib/mock";

const TINT: Record<Platform, string> = {
  linkedin:  "bg-blue",
  instagram: "bg-pink",
  facebook:  "bg-indigo",
  blog:      "bg-orange",
};

const LETTER: Record<Platform, string> = {
  linkedin: "in",
  instagram: "Ig",
  facebook: "fb",
  blog: "B",
};

export function PlatformGlyph({ platform, size = 24 }: { platform: Platform; size?: number }) {
  return (
    <span
      className={`inline-grid place-items-center rounded-[6px] text-white shadow-card ${TINT[platform]}`}
      style={{ width: size, height: size, fontSize: size * 0.45, fontWeight: 700, letterSpacing: "-0.04em" }}
      aria-label={platform}
    >
      {LETTER[platform]}
    </span>
  );
}
