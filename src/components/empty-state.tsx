export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-panel rounded-3xl border-dashed p-8 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
    </div>
  );
}
