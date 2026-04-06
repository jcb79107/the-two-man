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
        "surface-glass rounded-[26px] border border-white/70 p-4 shadow-[0_18px_40px_rgba(17,32,23,0.1)] md:rounded-[30px] md:p-6 md:shadow-[0_22px_60px_rgba(17,32,23,0.12)]",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3 md:mb-5 md:gap-4">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-fairway/68">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1.5 text-[1.15rem] font-semibold text-ink md:mt-2 md:text-[1.45rem]">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
