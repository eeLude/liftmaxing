export function ActivityLegend() {
  return (
    <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
        Gym
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        Run
      </span>
    </div>
  );
}
