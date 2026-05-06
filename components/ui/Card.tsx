import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  inset = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-[18px] bg-card-grouped shadow-card",
        inset ? "p-0" : "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  caption,
  right,
  className,
}: {
  title: React.ReactNode;
  caption?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between px-5 pt-4", className)}>
      <div>
        <h3 className="text-headline">{title}</h3>
        {caption && <p className="mt-0.5 text-footnote text-label-secondary">{caption}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/* iOS grouped list — children should be <Row> elements */
export function Group({
  header,
  footer,
  children,
  className,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {header && (
        <p className="mb-1.5 px-4 text-[13px] uppercase tracking-[0.04em] text-label-secondary">
          {header}
        </p>
      )}
      <div className="overflow-hidden rounded-[14px] bg-card-grouped shadow-card">
        <ul>{children}</ul>
      </div>
      {footer && (
        <p className="mt-2 px-4 text-footnote text-label-secondary">{footer}</p>
      )}
    </section>
  );
}

export function Row({
  leading,
  title,
  caption,
  trailing,
  href,
  onClick,
  className,
  chevron = false,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  caption?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  chevron?: boolean;
}) {
  const inner = (
    <div className="relative flex items-center gap-3 px-4 py-3 hairline-b group-last:after:hidden">
      {leading && <span className="shrink-0">{leading}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium tracking-[-0.008em] text-label">
          {title}
        </p>
        {caption && (
          <p className="mt-0.5 truncate text-[13px] text-label-secondary">{caption}</p>
        )}
      </div>
      {trailing && <div className="shrink-0 text-[14px] text-label-secondary">{trailing}</div>}
      {chevron && (
        <svg width="8" height="14" viewBox="0 0 8 14" className="text-label-tertiary" aria-hidden>
          <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </div>
  );

  const cls = cn("group block hover:bg-fill-quaternary transition-colors", className);

  if (href) {
    return (
      <li>
        <a href={href} className={cls}>{inner}</a>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} className={cn(cls, "w-full text-left")}>{inner}</button>
      </li>
    );
  }
  return <li className={cls}>{inner}</li>;
}
