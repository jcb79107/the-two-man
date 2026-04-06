function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-brand rounded-[22px] ${className}`} />;
}

function TopNavSkeleton() {
  return (
    <div className="sticky top-0 z-30 border-b border-white/60 bg-[#f7f1e3]/92 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <SkeletonBlock className="h-11 w-11 rounded-full border border-[#d8c07d]/45 bg-[linear-gradient(135deg,#fff6e7_0%,#f1dfb8_100%)]" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-32 bg-[linear-gradient(135deg,#f6ebcf_0%,#e8d7ab_100%)]" />
          <SkeletonBlock className="h-3 w-40 bg-[linear-gradient(135deg,#f6ebcf_0%,#e8d7ab_100%)]" />
        </div>
        <SkeletonBlock className="h-8 w-16 rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-80" />
      </div>
    </div>
  );
}

function BottomNavSkeleton() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:px-6">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 rounded-full border border-white/70 bg-[#f7f0df]/92 p-2 shadow-[0_18px_34px_rgba(17,32,23,0.12)] backdrop-blur">
        <SkeletonBlock className="h-10 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#f8f1e2_100%)]" />
        <SkeletonBlock className="h-10 rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-80" />
        <SkeletonBlock className="h-10 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#f8f1e2_100%)]" />
      </div>
    </div>
  );
}

export function PublicPageLoadingShell() {
  return (
    <>
      <TopNavSkeleton />
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-5 pb-28 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-[#d8c07d]/55 bg-[linear-gradient(135deg,#f7f1e3_0%,#efdfb0_100%)] p-5 shadow-[0_18px_40px_rgba(17,32,23,0.12)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <SkeletonBlock className="h-28 w-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff9ed_0%,#f3e2ba_62%,#e3c984_100%)] md:h-40 md:w-40" />
            <div className="w-full max-w-sm space-y-2">
              <SkeletonBlock className="mx-auto h-9 w-52 bg-[linear-gradient(135deg,#ffffff_0%,#f4ead1_100%)]" />
              <SkeletonBlock className="mx-auto h-4 w-36 bg-[linear-gradient(135deg,#fff5df_0%,#efddb5_100%)]" />
            </div>
          </div>
        </section>
        <section className="space-y-4">
          <div className="rounded-[28px] border border-white/65 bg-white/80 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <SkeletonBlock className="h-8 w-36 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
              <SkeletonBlock className="h-8 w-20 rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-80" />
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
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-5 pb-28 sm:px-6 lg:px-8">
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
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-5 pb-28 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-white/65 bg-white/80 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
          <SkeletonBlock className="h-8 w-52 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
          <SkeletonBlock className="mt-3 h-4 w-80 max-w-full bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          <div className="mt-4 flex gap-2 overflow-hidden">
            <SkeletonBlock className="h-10 w-32 rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
            <SkeletonBlock className="h-10 w-32 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#f8f1e2_100%)]" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#fff9ed_0%,#f3e2ba_100%)]" />
            <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#fff9ed_0%,#f3e2ba_100%)]" />
            <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#fff9ed_0%,#f3e2ba_100%)]" />
          </div>
        </section>
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="rounded-[28px] border border-white/65 bg-white/85 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
            <SkeletonBlock className="h-4 w-24 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
            <SkeletonBlock className="mt-3 h-7 w-20 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((__, row) => (
                <div key={row} className="rounded-[24px] border border-[#e7dbc0] bg-[#fcfaf4] p-4">
                  <div className="flex items-start gap-3">
                    <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-90" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBlock className="h-5 w-36 bg-[linear-gradient(135deg,#f2e5c7_0%,#fff9ed_100%)]" />
                      <SkeletonBlock className="h-4 w-24 bg-[linear-gradient(135deg,#f2e5c7_0%,#fff9ed_100%)]" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <SkeletonBlock className="h-14 w-full bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
                    <SkeletonBlock className="h-14 w-full bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
                    <SkeletonBlock className="h-14 w-full bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
      <BottomNavSkeleton />
    </>
  );
}

export function BracketLoadingShell() {
  return (
    <>
      <TopNavSkeleton />
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-5 pb-28 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-white/65 bg-white/80 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
          <SkeletonBlock className="h-8 w-44 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
          <SkeletonBlock className="mt-3 h-4 w-72 max-w-full bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#fff9ed_0%,#f3e2ba_100%)]" />
            <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#fff9ed_0%,#f3e2ba_100%)]" />
            <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#fff9ed_0%,#f3e2ba_100%)]" />
          </div>
          <div className="mt-5 flex gap-2 overflow-hidden">
            <SkeletonBlock className="h-11 w-28 rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
            <SkeletonBlock className="h-11 w-28 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#f8f1e2_100%)]" />
            <SkeletonBlock className="h-11 w-28 rounded-full bg-[linear-gradient(135deg,#efe4c8_0%,#f8f1e2_100%)]" />
          </div>
        </section>
        <section className="overflow-hidden rounded-[28px] border border-white/65 bg-white/85 p-5 shadow-[0_18px_34px_rgba(17,32,23,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SkeletonBlock className="h-6 w-36 bg-[linear-gradient(135deg,#f5ecda_0%,#fff9f0_100%)]" />
            <SkeletonBlock className="h-4 w-24 bg-[linear-gradient(135deg,#efe4c8_0%,#f7efdf_100%)]" />
          </div>
          <div className="flex gap-4 overflow-hidden">
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
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-5 pb-28 sm:px-6 lg:px-8">
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
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-5 pb-16 sm:px-6 lg:px-8">
        <section className="rounded-[30px] border border-[#d8c07d]/55 bg-[linear-gradient(135deg,#f7f1e3_0%,#efdfb0_100%)] p-6 shadow-[0_22px_48px_rgba(17,32,23,0.12)]">
          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="flex gap-4">
              <SkeletonBlock className="h-24 w-24 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff9ed_0%,#f3e2ba_62%,#e3c984_100%)]" />
              <div className="flex-1 space-y-3">
                <SkeletonBlock className="h-4 w-40 bg-[linear-gradient(135deg,#fff6e4_0%,#efddb6_100%)]" />
                <SkeletonBlock className="h-12 w-72 bg-[linear-gradient(135deg,#ffffff_0%,#f3e4c0_100%)]" />
                <SkeletonBlock className="h-4 w-full max-w-xl bg-[linear-gradient(135deg,#fff6e4_0%,#efddb6_100%)]" />
                <SkeletonBlock className="h-4 w-4/5 bg-[linear-gradient(135deg,#fff6e4_0%,#efddb6_100%)]" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
              <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#efe4c8_0%,#fff8e7_100%)]" />
              <SkeletonBlock className="h-20 w-full bg-[linear-gradient(135deg,#efe4c8_0%,#fff8e7_100%)]" />
            </div>
          </div>
        </section>
        <section className="rounded-[28px] border border-white/70 bg-[#f6efe1]/92 p-3 shadow-[0_16px_34px_rgba(17,32,23,0.08)]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
            <SkeletonBlock className="h-11 w-full rounded-full bg-[linear-gradient(135deg,#1f6b4f_0%,#2b7c5d_100%)] opacity-85" />
            <SkeletonBlock className="h-11 w-full rounded-full bg-[linear-gradient(135deg,#fff8ea_0%,#efe2c0_100%)]" />
            <SkeletonBlock className="h-11 w-full rounded-full bg-[linear-gradient(135deg,#fff8ea_0%,#efe2c0_100%)]" />
            <SkeletonBlock className="h-11 w-full rounded-full bg-[linear-gradient(135deg,#fff8ea_0%,#efe2c0_100%)]" />
          </div>
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
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
