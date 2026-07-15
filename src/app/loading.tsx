export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
      <div className="mb-5 h-12 w-full animate-pulse rounded-full bg-white/10" />
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <LoadingSection />
        <LoadingSection />
      </div>
    </main>
  );
}

function LoadingSection() {
  return (
    <section className="min-w-0">
      <div className="mb-3 h-7 w-24 animate-pulse rounded-md bg-white/10" />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
            <div className="aspect-[4/3] animate-pulse bg-white/10" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
