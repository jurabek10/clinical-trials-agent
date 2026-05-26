export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white mt-12">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          Data: ClinicalTrials.gov · LLM acts only as a planner; counts are deterministic.
        </span>
        <span>© {new Date().getFullYear()} ct-agent</span>
      </div>
    </footer>
  );
}
