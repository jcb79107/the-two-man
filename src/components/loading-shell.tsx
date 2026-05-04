function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-brand rounded-[22px] ${className}`} />;
}

function TopNavSkeleton() {
  return (
    <div className="sticky top-0 z-30 border-b border-white/65 bg-[#f6efe1]/84 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur sm:px-6 sm:py-3 lg:px-8">
      <div className="mx-auto flex w-full max-w-[620px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full border border-[#d8c07d]/45 bg-[linear-gradient(135deg,#fff6e7_0%,#f1dfb8_100%)] sm:h-12 sm:w-12" />
          <div className="min-w-0 space-y-2">
            <SkeletonBlock className="h-4 w-28 bg-[linear-gradient(135deg,#f6ebcf_0%,#e8d7ab_100%)] sm:w-32" />
            <SkeletonBlock className="h-3 w-32 bg-[linear-gradient(135deg,#f6ebcf_0%,#e8d7ab_100%)] sm:w-40" />
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <SkeletonBlock className="h-9 w-20 rounded-full bg-white/88" />
          <SkeletonBlock className="h-9 w-20 rounded-full bg-white/88" />
          <SkeletonBlock className="h-9 w-24 rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-80" />
        </div>
        <SkeletonBlock className="h-8 w-16 rounded-full border border-fairway/15 bg-white/88 md:hidden" />
      </div>
    </div>
  );
}

function BottomNavSkeleton() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-fairway/10 bg-white/94 px-4 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] backdrop-blur md:hidden">
      <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
        <SkeletonBlock className="h-10 rounded-2xl bg-sand" />
        <SkeletonBlock className="h-10 rounded-2xl bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
        <SkeletonBlock className="h-10 rounded-2xl bg-sand" />
      </div>
    </div>
  );
}

export function PublicPageLoadingShell() {
  return (
    <>
      <TopNavSkeleton />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-24 sm:px-6">
        <section className="relative flex min-h-[270px] items-center justify-center overflow-hidden px-4 py-2 md:min-h-[340px]">
          <div className="pointer-events-none absolute inset-x-8 top-8 h-52 rounded-full bg-[radial-gradient(circle,#fff7dd_0%,rgba(239,213,139,0.44)_45%,rgba(239,213,139,0)_72%)] blur-2xl md:inset-x-20 md:h-64" />
          <div className="relative flex items-center justify-center text-center">
            <SkeletonBlock className="h-64 w-64 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff9ed_0%,#f3e2ba_62%,#e3c984_100%)] md:h-80 md:w-80" />
          </div>
        </section>
        <section className="rounded-[22px] border border-mist bg-white px-4 py-3 shadow-[0_10px_24px_rgba(17,32,23,0.08)]">
          <SkeletonBlock className="h-4 w-40 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          <div className="mt-3 flex w-full items-center justify-between rounded-[22px] bg-pine px-4 py-3 shadow-[0_14px_28px_rgba(17,32,23,0.18)]">
            <div className="flex items-center gap-4">
              <SkeletonBlock className="h-10 w-10 rounded-2xl border border-white/18 bg-white/10" />
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-36 bg-white/24" />
                <SkeletonBlock className="h-3 w-24 bg-white/16" />
              </div>
            </div>
            <SkeletonBlock className="h-4 w-12 bg-white/18" />
          </div>
        </section>
        <section className="space-y-4">
          <div className="surface-glass rounded-[26px] border border-white/70 p-4 shadow-[0_18px_40px_rgba(17,32,23,0.1)] md:rounded-[30px] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <SkeletonBlock className="h-8 w-36 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
            </div>
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-[#e7dbc0] bg-[linear-gradient(135deg,#fdfbf6_0%,#f4ecdc_100%)] p-4"
                >
                  <div className="flex gap-3">
                    <SkeletonBlock className="h-12 w-12 shrink-0 rounded-2xl bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBlock className="h-5 w-4/5 bg-[linear-gradient(135deg,#f3e4c0_0%,#fff6e4_100%)]" />
                      <SkeletonBlock className="h-3 w-32 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
                      <SkeletonBlock className="h-4 w-11/12 bg-[linear-gradient(135deg,#f8f1e2_0%,#fff9f1_100%)]" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <SkeletonBlock className="h-9 w-32 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#f8f1e2_100%)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <BottomNavSkeleton />
    </>
  );
}

export function MatchFlowLoadingShell() {
  return (
    <>
      <TopNavSkeleton />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-28 sm:px-6">
        <section className="rounded-[28px] border border-[#d8c07d]/55 bg-[linear-gradient(135deg,#f7f1e3_0%,#efdfb0_100%)] p-5 shadow-[0_18px_40px_rgba(17,32,23,0.12)]">
          <SkeletonBlock className="h-4 w-24 bg-[linear-gradient(135deg,#fff6e4_0%,#efddb6_100%)]" />
          <SkeletonBlock className="mt-4 h-10 w-56 bg-[linear-gradient(135deg,#ffffff_0%,#f3e4c0_100%)]" />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <SkeletonBlock className="h-10 w-36 rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2a7658_100%)] opacity-85" />
            <SkeletonBlock className="h-10 w-6 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#fff8e7_100%)]" />
            <SkeletonBlock className="h-10 w-36 rounded-full bg-[linear-gradient(135deg,#654f9b_0%,#7f69b9_100%)] opacity-85" />
          </div>
        </section>
        <section className="rounded-[28px] border border-white/65 bg-white/85 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
          <SkeletonBlock className="h-5 w-24 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-[#e8dbc1] bg-[linear-gradient(135deg,#fcfaf4_0%,#f2e9d7_100%)] p-4"
              >
                <SkeletonBlock className="h-4 w-20 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
                <SkeletonBlock className="mt-3 h-8 w-36 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
                <SkeletonBlock className="mt-3 h-4 w-24 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[28px] border border-white/65 bg-white/85 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
          <SkeletonBlock className="h-5 w-32 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          <div className="mt-5 overflow-hidden rounded-[26px] border border-[#d8c07d]/45">
            <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
              <SkeletonBlock className="h-16 rounded-none bg-[linear-gradient(135deg,#7f7a72_0%,#989288_100%)]" />
              <SkeletonBlock className="h-16 rounded-none bg-[linear-gradient(135deg,#7f7a72_0%,#989288_100%)]" />
              <SkeletonBlock className="h-16 rounded-none bg-[linear-gradient(135deg,#7f7a72_0%,#989288_100%)]" />
              <SkeletonBlock className="h-16 rounded-none bg-[linear-gradient(135deg,#ead484_0%,#f5e6aa_100%)]" />
              <SkeletonBlock className="h-16 rounded-none bg-[linear-gradient(135deg,#ead484_0%,#f5e6aa_100%)]" />
            </div>
            <div className="space-y-px bg-[#d8c07d]/35">
              <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] gap-px">
                <SkeletonBlock className="h-14 rounded-none bg-white" />
                <SkeletonBlock className="h-14 rounded-none bg-white" />
                <SkeletonBlock className="h-14 rounded-none bg-white" />
                <SkeletonBlock className="h-14 rounded-none bg-white" />
                <SkeletonBlock className="h-14 rounded-none bg-white" />
              </div>
              <div className="grid grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] gap-px">
                <SkeletonBlock className="h-14 rounded-none bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-90" />
                <SkeletonBlock className="h-14 rounded-none bg-[linear-gradient(135deg,rgba(31,107,79,0.22)_0%,rgba(31,107,79,0.32)_100%)]" />
                <SkeletonBlock className="h-14 rounded-none bg-[linear-gradient(135deg,rgba(31,107,79,0.22)_0%,rgba(31,107,79,0.32)_100%)]" />
                <SkeletonBlock className="h-14 rounded-none bg-[linear-gradient(135deg,rgba(31,107,79,0.22)_0%,rgba(31,107,79,0.32)_100%)]" />
                <SkeletonBlock className="h-14 rounded-none bg-[linear-gradient(135deg,rgba(31,107,79,0.22)_0%,rgba(31,107,79,0.32)_100%)]" />
              </div>
            </div>
          </div>
        </section>
      </main>
      <BottomNavSkeleton />
    </>
  );
}

export function StandingsLoadingShell() {
  return (
    <>
      <TopNavSkeleton />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-24 sm:px-6">
        <section className="surface-glass rounded-[26px] border border-white/70 p-4 shadow-[0_18px_40px_rgba(17,32,23,0.1)] md:rounded-[30px] md:p-6">
          <SkeletonBlock className="h-8 w-52 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
          <SkeletonBlock className="mt-3 h-4 w-80 max-w-full bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-[22px] bg-sand/78 p-1">
            <SkeletonBlock className="h-12 rounded-[18px] bg-sand/80" />
            <SkeletonBlock className="h-12 rounded-[18px] bg-sand/80" />
            <SkeletonBlock className="h-12 rounded-[18px] bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
          </div>
        </section>
        <section className="surface-glass rounded-[26px] border border-white/70 p-4 shadow-[0_18px_40px_rgba(17,32,23,0.1)] md:rounded-[30px] md:p-6">
          <SkeletonBlock className="h-8 w-32 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-[20px] border border-mist/80 bg-white/70 p-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex min-h-10 items-center gap-2 rounded-[16px] bg-white px-2.5 py-2">
                <SkeletonBlock className={`h-7 w-7 rounded-full ${index === 2 ? "bg-[#efe7ff]" : index === 3 ? "bg-[#f8e5e0]" : "bg-[#dff0ea]"}`} />
                <SkeletonBlock className="h-3 w-20 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-mist bg-white">
            <SkeletonBlock className="h-14 rounded-none bg-sand" />
            <div className="divide-y divide-mist/80">
              {Array.from({ length: 6 }).map((_, row) => (
                <div key={row} className="grid grid-cols-[1fr_76px] items-center gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-9 w-12 rounded-full bg-[#e3f1ea]" />
                    <SkeletonBlock className="h-5 w-40 max-w-full bg-[linear-gradient(135deg,#f2e5c7_0%,#fff9ed_100%)]" />
                  </div>
                  <SkeletonBlock className="h-5 w-14 justify-self-end bg-[linear-gradient(135deg,#f2e5c7_0%,#fff9ed_100%)]" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <BottomNavSkeleton />
    </>
  );
}

export function BracketLoadingShell() {
  return (
    <>
      <TopNavSkeleton />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-24 sm:px-6">
        <section className="surface-glass overflow-hidden rounded-[26px] border border-white/70 p-4 shadow-[0_18px_40px_rgba(17,32,23,0.1)] md:rounded-[30px] md:p-6">
          <div className="mb-4">
            <SkeletonBlock className="h-8 w-56 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
          </div>
          <div className="-mx-1 mb-6 flex gap-2 overflow-hidden px-1">
            <SkeletonBlock className="h-20 min-w-[208px] rounded-[22px] bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-90" />
            <SkeletonBlock className="h-20 min-w-[208px] rounded-[22px] border border-[#d8cab0] bg-white" />
            <SkeletonBlock className="h-20 min-w-[208px] rounded-[22px] border border-[#d8cab0] bg-white" />
          </div>
          <div className="rounded-[20px] border border-[#d8cab0] bg-[#fffaf2] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <SkeletonBlock className="h-4 w-24 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
                <SkeletonBlock className="mt-3 h-8 w-36 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
              </div>
              <SkeletonBlock className="h-8 w-16 bg-[linear-gradient(135deg,#e3f1ea_0%,#d1eadf_100%)]" />
            </div>
          </div>
          <div className="mt-4 flex gap-4 overflow-hidden">
            {['Quarterfinals', 'Semifinals', 'Championship'].map((label, index) => (
              <div key={label} className="min-w-[280px] flex-1">
                <SkeletonBlock className="h-4 w-24 bg-[linear-gradient(135deg,#34c18d_0%,#56dfaa_100%)] opacity-80" />
                <SkeletonBlock className="mt-3 h-7 w-32 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
                <div className={`mt-6 space-y-5 ${index === 1 ? 'pt-14' : index === 2 ? 'pt-28' : ''}`}>
                  {Array.from({ length: index === 0 ? 4 : index === 1 ? 2 : 1 }).map((_, card) => (
                    <div key={card} className="rounded-[24px] border border-[#1f6b4f]/12 bg-[linear-gradient(180deg,#183f31_0%,#112e24_100%)] p-4 shadow-[0_16px_30px_rgba(17,32,23,0.12)]">
                      <SkeletonBlock className="h-4 w-20 bg-[linear-gradient(135deg,rgba(90,214,162,0.35)_0%,rgba(90,214,162,0.55)_100%)]" />
                      <div className="mt-4 space-y-3">
                        <SkeletonBlock className="h-12 w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.18)_100%)]" />
                        <SkeletonBlock className="h-12 w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.18)_100%)]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <BottomNavSkeleton />
    </>
  );
}

export function PublicMatchLoadingShell() {
  return (
    <>
      <TopNavSkeleton />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-28 sm:px-6">
        <section className="rounded-[28px] border border-white/65 bg-white/82 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
          <SkeletonBlock className="h-8 w-40 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
          <div className="mt-5 rounded-[24px] border border-[#d8c07d]/45 bg-[linear-gradient(135deg,#fffaf0_0%,#f2e4bf_100%)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <SkeletonBlock className="h-4 w-28 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
                <SkeletonBlock className="h-10 w-64 bg-[linear-gradient(135deg,#ffffff_0%,#f4ead1_100%)]" />
              </div>
              <SkeletonBlock className="h-8 w-16 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#f8f1e2_100%)]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SkeletonBlock className="h-16 w-full bg-[linear-gradient(135deg,#f7edd7_0%,#fffaf2_100%)]" />
              <SkeletonBlock className="h-16 w-full bg-[linear-gradient(135deg,#f7edd7_0%,#fffaf2_100%)]" />
            </div>
          </div>
        </section>
        <section className="rounded-[28px] border border-white/65 bg-white/85 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
          <SkeletonBlock className="h-4 w-28 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          <SkeletonBlock className="mt-3 h-8 w-40 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SkeletonBlock className="h-36 w-full bg-[linear-gradient(135deg,#fcfaf4_0%,#f2e9d7_100%)]" />
            <SkeletonBlock className="h-36 w-full bg-[linear-gradient(135deg,#fcfaf4_0%,#f2e9d7_100%)]" />
          </div>
        </section>
        <section className="rounded-[28px] border border-white/65 bg-white/85 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
          <SkeletonBlock className="h-4 w-32 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          <SkeletonBlock className="mt-3 h-8 w-36 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
          <div className="mt-5 overflow-hidden rounded-[26px] border border-[#d8c07d]/45">
            <div className="grid grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]">
              {Array.from({ length: 6 }).map((_, idx) => (
                <SkeletonBlock key={idx} className={`h-16 rounded-none ${idx < 4 ? 'bg-[linear-gradient(135deg,#7f7a72_0%,#989288_100%)]' : 'bg-[linear-gradient(135deg,#ead484_0%,#f5e6aa_100%)]'}`} />
              ))}
            </div>
            <div className="grid grid-cols-[1.2fr_repeat(5,minmax(0,1fr))] gap-px bg-[#d8c07d]/35">
              {Array.from({ length: 12 }).map((_, idx) => (
                <SkeletonBlock key={idx} className={`h-14 rounded-none ${idx % 6 === 0 ? 'bg-[linear-gradient(135deg,#654f9b_0%,#7f69b9_100%)]' : 'bg-[linear-gradient(135deg,rgba(101,79,155,0.22)_0%,rgba(101,79,155,0.36)_100%)]'}`} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <BottomNavSkeleton />
    </>
  );
}

export function AdminLoadingShell() {
  return (
    <>
      <TopNavSkeleton />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-16 sm:px-6">
        <section className="rounded-[30px] border border-[#d8c07d]/55 bg-[linear-gradient(135deg,#f7f1e3_0%,#efdfb0_100%)] p-6 shadow-[0_22px_48px_rgba(17,32,23,0.12)]">
          <div className="grid gap-5 md:grid-cols-[1.25fr_0.95fr]">
            <div className="flex gap-4">
              <SkeletonBlock className="h-24 w-24 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff9ed_0%,#f3e2ba_62%,#e3c984_100%)]" />
              <div className="flex-1 space-y-3">
                <SkeletonBlock className="h-4 w-40 bg-[linear-gradient(135deg,#fff6e4_0%,#efddb6_100%)]" />
                <SkeletonBlock className="h-12 w-72 bg-[linear-gradient(135deg,#ffffff_0%,#f3e4c0_100%)]" />
                <SkeletonBlock className="h-4 w-full max-w-xl bg-[linear-gradient(135deg,#fff6e4_0%,#efddb6_100%)]" />
                <SkeletonBlock className="h-4 w-4/5 bg-[linear-gradient(135deg,#fff6e4_0%,#efddb6_100%)]" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
              <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#efe4c8_0%,#fff8e7_100%)]" />
              <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#efe4c8_0%,#fff8e7_100%)]" />
            </div>
          </div>
        </section>
        <section className="rounded-[28px] border border-white/70 bg-[#f6efe1]/92 p-3 shadow-[0_16px_34px_rgba(17,32,23,0.08)]">
          <div className="grid grid-cols-3 gap-2">
            <SkeletonBlock className="h-11 w-full rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
            <SkeletonBlock className="h-11 w-full rounded-full bg-[linear-gradient(135deg,#fff8ea_0%,#efe2c0_100%)]" />
            <SkeletonBlock className="h-11 w-full rounded-full bg-[linear-gradient(135deg,#fff8ea_0%,#efe2c0_100%)]" />
          </div>
        </section>
        <section className="grid gap-4">
          <div className="space-y-4">
            <SkeletonBlock className="h-28 w-full bg-[linear-gradient(135deg,#fff9f0_0%,#f2e7d2_100%)]" />
            <SkeletonBlock className="h-52 w-full bg-[linear-gradient(135deg,#fff9f0_0%,#f2e7d2_100%)]" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-40 w-full bg-[linear-gradient(135deg,#fff9f0_0%,#f2e7d2_100%)]" />
            <SkeletonBlock className="h-40 w-full bg-[linear-gradient(135deg,#fff9f0_0%,#f2e7d2_100%)]" />
          </div>
        </section>
      </main>
    </>
  );
}
