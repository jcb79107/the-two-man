import Link from "next/link";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { initials, nameOf, type Match } from "./data";
import { result } from "./domain";
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    flag: (
      <>
        <path d="M5 21V3m0 1c6-5 8 5 15 0v9c-7 5-9-5-15 0" />
      </>
    ),
    cup: (
      <>
        <path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3c0 3 2 4 5 4m7-7h4v3c0 3-2 4-5 4m-3 1v6m-5 2h10" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />
      </>
    ),
    table: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M9 4v16M3 15h18" />
      </>
    ),
    users: (
      <>
        <circle cx="8" cy="8" r="3" />
        <path d="M2 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 1 1 0 6m2 4c3 0 5 2 5 5" />
      </>
    ),
    plus: <path d="M12 4v16M4 12h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8" cy="8" r="1" />
        <path d="m3 17 6-6 5 5 3-3 4 4" />
      </>
    ),
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.flag}
    </svg>
  );
}
export function Mark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/two-man-mark.png"
      width={1536}
      height={1024}
      alt="Two golf balls in sunglasses, a flat cap and a bucket hat"
      className={`mascot ${className}`}
      priority
    />
  );
}
export function Badge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    official: "Official",
    review: "Needs review",
    scheduled: "Scheduled",
    unbooked: "Date needed",
    correction: "Needs correction",
  };
  return (
    <span className={`badge ${status}`}>
      {status === "official" && <Icon name="check" size={12} />}
      <span>{labels[status] ?? status}</span>
    </span>
  );
}
export function TeamAvatar({ id, size = "" }: { id: string; size?: string }) {
  return (
    <span className={`team-avatar ${size} team-${Number(id.slice(1)) % 3}`}>
      {initials(id)}
    </span>
  );
}
export function TeamName({ id }: { id: string }) {
  return (
    <Link href={`/teams/${id}`} className="team-name">
      {nameOf(id)}
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>
          {title.split("<br/>").map((line, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </h1>
        {description && <p className="muted intro">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({
  title,
  href,
  label = "View all",
}: {
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {href && (
        <Link className="text-link" href={href}>
          {label}
          <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  );
}
export function MatchRow({ match: m }: { match: Match }) {
  const r = result(m);
  return (
    <Link className="match-row" href={`/matches/${m.id}`}>
      <div className="match-meta">
        <span className="eyebrow">Pod {m.pod}</span>
        <Badge status={m.status} />
      </div>
      <div className="match-pair">
        <div>
          <TeamAvatar id={m.a} />
          <span>{nameOf(m.a)}</span>
          <strong>{m.status === "official" ? r.aPoints : "—"}</strong>
        </div>
        <div>
          <TeamAvatar id={m.b} />
          <span>{nameOf(m.b)}</span>
          <strong>{m.status === "official" ? r.bPoints : "—"}</strong>
        </div>
      </div>
      <div className="match-footer">
        <span>{m.course}</span>
        <Icon name="arrow" size={17} />
      </div>
    </Link>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name="flag" size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
