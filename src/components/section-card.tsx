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
        "surface-glass rounded-[24px] border border-white/70 p-4 shadow-[0_14px_34px_rgba(17,32,23,0.09)] md:rounded-[28px] md:p-6 md:shadow-[0_20px_52px_rgba(17,32,23,0.11)]",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 md:mb-5 md:gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="label-caps text-fairway/68">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1.5 text-[1.18rem] font-semibold leading-tight text-ink md:mt-2 md:text-[1.42rem]">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
