import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">Out of bounds</p>
      <h1>This page isn’t on the card.</h1>
      <p>Head back to the tournament to find your match.</p>
      <Link className="button primary" href="/">
        Back to the clubhouse
      </Link>
    </main>
  );
}
