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
        "rounded-2xl border border-mist bg-[#fffcf7] p-4 md:p-6",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 md:mb-5 md:gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-medium leading-4 text-[#526057]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-xl font-medium leading-7 text-ink">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
