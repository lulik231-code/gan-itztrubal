"use client";

import { useState } from "react";
import { BulkDownloadButton } from "@/components/BulkDownloadButton";
import { getEarlyReleaseMonthExportAction } from "../exportActions";

export function MonthDownload({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="export-month" className="text-sm font-medium text-pine-dark">חודש להורדה</label>
        <input
          id="export-month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          dir="ltr"
          className="rounded-lg border border-line bg-card px-3 py-2 text-pine-dark focus:border-amber focus:outline-none"
        />
      </div>
      <div className="py-2.5">
        <BulkDownloadButton
          label="הורדת החודש כולו (ZIP)"
          load={() => getEarlyReleaseMonthExportAction(month)}
          disabled={!month}
        />
      </div>
    </div>
  );
}
