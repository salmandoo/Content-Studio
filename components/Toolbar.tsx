import { cn } from "@/lib/cn";

export function Toolbar({
  title,
  subtitle,
  actions,
  back,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 material-thick border-b border-separator",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-6 py-3 sm:px-8">
        {back ? (
          <a
            href={back.href}
            className="pressable mr-1 flex items-center gap-0.5 text-[15px] font-medium text-blue"
          >
            <svg width="11" height="18" viewBox="0 0 11 18" aria-hidden>
              <path
                d="M9 1L2 9L9 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="ml-0.5">{back.label}</span>
          </a>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.012em] text-label">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[12px] text-label-secondary">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="rise mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-label-tertiary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-large-title tracking-[-0.022em]">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-[60ch] text-body text-label-secondary">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}
