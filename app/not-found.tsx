import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.24em] text-fairway/70">Not found</p>
      <h1 className="mt-4 text-4xl font-semibold text-ink">This fairway does not exist.</h1>
      <p className="mt-4 text-sm leading-7 text-ink/75">
        The requested tournament or match could not be found.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-pine px-4 py-2 text-sm font-medium text-white"
      >
        Return home
      </Link>
    </main>
  );
}
