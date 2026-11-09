import Link from "next/link";
import { archive2026, entryName } from "./history-data";
import { Icon, Mark, PageHeading } from "./ui";

export function OffseasonHome() {
  const s = archive2026;
  const final = s.games.find((g) => g.round === "Final")!;
  return (
    <div className="offseason-home">
      <header className="clubhouse-heading">
        <div>
          <p className="eyebrow">Between seasons</p>
          <h1>The Two-Man</h1>
        </div>
        <div className="clubhouse-mark" aria-hidden="true">
          <Mark />
        </div>
      </header>
      <section
        className="offseason-champions"
        aria-labelledby="champions-heading"
      >
        <div className="offseason-year">
          <span>Season 1</span>
          <strong>2026</strong>
          <span>18 teams · 25 matches</span>
        </div>
        <div>
          <p className="eyebrow">The champions</p>
          <h2 id="champions-heading">{entryName(s, s.champion!)}</h2>
          <p>
            Defeated {entryName(s, s.runnerUp!)} · {final.score}
          </p>
          <Link className="text-link" href={final.href}>
            Revisit the final <Icon name="arrow" />
          </Link>
        </div>
      </section>
      <nav className="history-season-links" aria-label="Season 1">
        <Link href="/history/2026?view=results">
          Match results <Icon name="arrow" />
        </Link>
        <Link href="/history/2026?view=standings">
          Final standings <Icon name="arrow" />
        </Link>
        <Link href="/history/2026?view=playoffs">
          Playoff bracket <Icon name="arrow" />
        </Link>
      </nav>
      <section className="offseason-next">
        <div>
          <p className="eyebrow">Up next · Season 2</p>
          <h2>See you next season.</h2>
        </div>
        <p>
          The field and format are still taking shape. Details coming this
          winter.
        </p>
      </section>
      <Link className="text-link" href="/history">
        Explore Season 1 <Icon name="arrow" />
      </Link>
    </div>
  );
}

export function OffseasonRules() {
  return (
    <>
      <PageHeading eyebrow="2026 · Season 1 archive" title="Rules & format" />
      <p className="offseason-rules-note">
        These are the Season 1 rules. Season 2’s field, format and schedule will
        be announced this winter.
      </p>
      <div className="rules-list">
        {[
          [
            "Tournament format",
            "18 teams in six pods of three. Each team plays both pod opponents over 18 holes of two-man net better-ball match play. Six pod winners and two wild cards advance to the eight-team playoff.",
          ],
          [
            "Handicaps & strokes",
            "Every player must have a GHIN and an accurate handicap. At least one person in the group must have the GHIN app. Set up four-ball match play at 90%, using the correct course and each player’s tees. The lowest player plays off zero; the others receive the difference. Follow GHIN’s allocation, with the tournament’s maximum of one stroke per hole per player.",
          ],
          [
            "Pod scoring & tiebreakers",
            "A hole win earns one point; a halved hole earns half a point for each team. Rank teams by match record, total hole points, holes won, then lowest cumulative net better-ball score. A remaining tie is settled by coin flip. The same order applies to wild cards and seeding.",
          ],
          [
            "Playoffs",
            "Pod winners take seeds 1–6; wild cards take seeds 7–8. The higher seed chooses the course. If tied after 18 holes, use sudden death when feasible, then a net scorecard playoff from hole 18 backward, then a coin flip.",
          ],
          [
            "Course & scheduling",
            "Teams arrange their match together at a mutually agreed regulation course with a slope rating. Players may use different tees with the corresponding handicaps. Season 1 matches were due within the assigned month; the commissioner could award a forfeit for an unplayed match.",
          ],
          [
            "Reporting results",
            "For pod matches, send the full scorecard and the match result, hole points, holes won and net better-ball score to the commissioner. Post the match score to GHIN. Playoff history records the winner and final result; full playoff cards were not recorded.",
          ],
          [
            "Forfeits",
            "A forfeit gives the opponent the win, 12 hole points and six holes won. No best-ball score is recorded.",
          ],
        ].map(([title, text]) => (
          <section className="offseason-rule" key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
    </>
  );
}
