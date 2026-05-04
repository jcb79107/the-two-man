import { clsx } from "clsx";
import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
  id?: string;
}

export function SectionCard({
  id,
  title,
  eyebrow,
  action,
  className,
  children
}: SectionCardProps) {
  return (
    <section
      id={id}
      className={clsx(
        "surface-glass rounded-[24px] border border-white/75 bg-white/92 p-4 shadow-[0_12px_32px_rgba(17,32,23,0.08)] md:rounded-[28px] md:p-6 md:shadow-[0_18px_48px_rgba(17,32,23,0.1)]",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3 md:mb-5 md:gap-4">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fairway/68">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em] text-ink md:mt-1.5 md:text-[1.4rem]">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
