export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-yellow-300" />
      </div>
      <div className="grid gap-4">
        <div className="h-10 w-2/3 rounded-xl bg-white/10" />
        <div className="h-28 rounded-2xl bg-white/5" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-52 rounded-2xl bg-white/5" />
          <div className="h-52 rounded-2xl bg-white/5" />
        </div>
      </div>
    </main>
  );
}
