import { PineconeMark } from "@/components/PineconeMark";

export function SiteHeader() {
  return (
    <header className="bg-pine text-card">
      <div className="max-w-2xl mx-auto px-5 py-5 flex items-center gap-3">
        <PineconeMark className="h-9 w-9 shrink-0" />
        <div>
          <h1 className="text-2xl font-display leading-tight">גן אצטרובל</h1>
          <p className="text-sm text-sage-light/90 leading-tight">טפסי הסכמת הורים</p>
        </div>
      </div>
    </header>
  );
}
