"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getSignedPdfUrl } from "./pdfActions";
import type { SubmissionWithRelations } from "@/types";

function formatDateTimeHebrew(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function SubmissionsTable({ submissions }: { submissions: SubmissionWithRelations[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(submission: SubmissionWithRelations) {
    setDownloadingId(submission.id);
    try {
      const url = await getSignedPdfUrl(submission.pdf_storage_path);
      if (url) {
        window.open(url, "_blank");
      } else {
        alert("שגיאה בהורדת הקובץ. נסו שוב.");
      }
    } finally {
      setDownloadingId(null);
    }
  }

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-pine-dark/60 py-6 text-center">
        עדיין לא הוגשו טפסי הסכמה לאירוע זה.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-line text-pine-dark/60 text-right">
            <th className="font-medium py-2 pr-2">ילד/ה</th>
            <th className="font-medium py-2">הורה חותם/ת</th>
            <th className="font-medium py-2">טלפון</th>
            <th className="font-medium py-2">בריאותי</th>
            <th className="font-medium py-2">צילום</th>
            <th className="font-medium py-2">תאריך הגשה</th>
            <th className="font-medium py-2"></th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="border-b border-line/60 hover:bg-sage-light/50">
              <td className="py-3 pr-2 font-medium text-pine-dark">
                {s.children?.full_name ?? "—"}
              </td>
              <td className="py-3 text-pine-dark/80">{s.parent_full_name}</td>
              <td className="py-3 text-pine-dark/80" dir="ltr">{s.parent_phone}</td>
              <td className="py-3">
                {s.health_declaration_checked ? (
                  <CheckCircle2 className="h-4 w-4 text-pine" />
                ) : (
                  <XCircle className="h-4 w-4 text-sage" />
                )}
              </td>
              <td className="py-3">
                {s.photo_consent_checked === null ? (
                  <span className="text-pine-dark/40">—</span>
                ) : s.photo_consent_checked ? (
                  <CheckCircle2 className="h-4 w-4 text-pine" />
                ) : (
                  <XCircle className="h-4 w-4 text-sage" />
                )}
              </td>
              <td className="py-3 text-pine-dark/60 whitespace-nowrap">
                {formatDateTimeHebrew(s.submitted_at)}
              </td>
              <td className="py-3">
                <button
                  onClick={() => handleDownload(s)}
                  disabled={downloadingId === s.id}
                  className="flex items-center gap-1.5 text-pine hover:text-amber-dark transition-colors text-sm disabled:opacity-50"
                >
                  {downloadingId === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
