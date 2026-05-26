export function Header() {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-brand-600 grid place-items-center text-white font-bold text-sm">
            CT
          </div>
          <span className="font-semibold tracking-tight">Clinical Trials Agent</span>
        </div>
        <a
          href="https://clinicaltrials.gov/data-api/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ClinicalTrials.gov v2 API ↗
        </a>
      </div>
    </header>
  );
}
