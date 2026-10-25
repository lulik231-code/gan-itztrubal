"use client";

import { useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import type { ExportResult } from "@/app/admin/exportActions";

interface Props {
  label: string;
  /** Asks the server for signed links + the CSV index. */
  load: () => Promise<ExportResult>;
  disabled?: boolean;
}

/**
 * Downloads many PDFs as one ZIP (plus an Excel-friendly CSV index).
 * The ZIP is built in the browser from short-lived signed links, so there is
 * no server size limit and the server never holds all files at once.
 */
export function BulkDownloadButton({ label, load, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setProgress("מכין קבצים...");
    try {
      const result = await load();
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      zip.file("רשימה.csv", result.csv);

      let done = 0;
      const queue = [...result.files];
      const failed: string[] = [];
      // 5 downloads at a time
      await Promise.all(
        Array.from({ length: Math.min(5, queue.length) }, async () => {
          while (queue.length) {
            const f = queue.shift()!;
            try {
              const res = await fetch(f.url);
              if (!res.ok) throw new Error(String(res.status));
              zip.file(f.name, await res.arrayBuffer());
            } catch {
              failed.push(f.name);
            }
            done += 1;
            setProgress(`מוריד קבצים ${done} מתוך ${result.files.length}...`);
          }
        })
      );

      if (failed.length === result.files.length) {
        setError("ההורדה נכשלה. נסי שוב.");
        return;
      }

      setProgress("יוצר קובץ ZIP...");
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${result.zipName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);

      if (failed.length > 0) {
        setError(`${failed.length} קבצים לא ירדו: ${failed.join(", ")}. נסי שוב.`);
      }
    } catch {
      setError("אירעה שגיאה בהורדה. נסי שוב.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy || disabled}
        className="inline-flex items-center gap-1.5 text-sm text-pine hover:text-amber-dark transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
        {busy ? progress : label}
      </button>
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
}
