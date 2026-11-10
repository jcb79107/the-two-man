"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { compareStanding, type Standing } from "./domain";
import { Icon, TeamAvatar, TeamName } from "./ui";
import { sortKeys, sortStandings, type SortKey } from "./standings-view";
const columns: [SortKey, string][] = [
  ["team", "Team"],
  ["record", "W–L–T"],
  ["points", "Hole pts"],
  ["holesWon", "Holes won"],
  ["net", "Net BB"],
  ["played", "Played"],
];
export function StandingsTable({
  rows,
  label,
}: {
  rows: Standing[];
  label: string;
}) {
  const query = useSearchParams();
  const router = useRouter();
  const requested = query.get("sort") as SortKey;
  const sort = sortKeys.includes(requested) ? requested : null;
  const direction = query.get("direction") === "asc" ? "asc" : "desc";
  const sorted = sort ? sortStandings(rows, sort, direction) : rows;
  function change(key: SortKey) {
    const params = new URLSearchParams(query);
    params.set("sort", key);
    params.set(
      "direction",
      sort === key
        ? direction === "asc"
          ? "desc"
          : "asc"
        : key === "team" || key === "net"
          ? "asc"
          : "desc",
    );
    router.replace("/standings?" + params, { scroll: false });
  }
  return (
    <>
      <p className="table-hint">Swipe the table for all ranking statistics.</p>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={label + ", scroll for all columns"}
      >
        <table className="standings-table">
          <caption className="sr-only">
            {label}. Column buttons sort the table; rank remains competition
            rank.
          </caption>
          <thead>
            <tr>
              {columns.map(([key, text]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sort === key
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    className="column-sort"
                    onClick={() => change(key)}
                    aria-label={"Sort by " + text}
                  >
                    {text}
                    <span aria-hidden="true">
                      {sort === key ? (
                        direction === "asc" ? (
                          "↑"
                        ) : (
                          "↓"
                        )
                      ) : (
                        <Icon name="sort" size={14} />
                      )}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.team.id}>
                <th scope="row">
                  <span
                    className="rank"
                    aria-label={
                      "Competition rank " +
                      (rows.findIndex(
                        (other) => compareStanding(other, r) === 0,
                      ) +
                        1)
                    }
                  >
                    {rows.findIndex(
                      (other) => compareStanding(other, r) === 0,
                    ) + 1}
                  </span>
                  <TeamAvatar id={r.team.id} />
                  <TeamName id={r.team.id} />
                </th>
                <td>
                  {r.won}–{r.lost}–{r.tied}
                </td>
                <td>
                  <strong>{r.points.toFixed(1)}</strong>
                </td>
                <td>{r.holesWon}</td>
                <td>{r.net}</td>
                <td>{r.played}/2</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
