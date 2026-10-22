"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { getSignedPdfUrl, deleteSubmissionAction } from "./pdfActions";
import type { SubmissionWithRelations } from "@/types";

function formatDateTimeHebrew(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function SubmissionsTable({ submissions }: { submissions: SubmissionWithRelations[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(submission: SubmissionWithRelations) {
    const childName = submission.children?.full_name ?? "הגשה זו";
    if (!confirm(`למחוק את ההגשה של ${childName}?\nהפעולה אינה ניתנת לביטול.`)) return;

    setDeletingId(submission.id);
    try {
      const result = await deleteSubmissionAction(submission.id, submission.pdf_storage_path);
      if (!result.success) {
        alert("שגיאה במחיקה. נסי שוב.");
      } else {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

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
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="border-b border-line text-pine-dark/60 text-right">
            <th className="font-medium py-2 pr-2">ילד/ה</th>
            <th className="font-medium py-2">הורה חותם/ת</th>
            <th className="font-medium py-2">טלפון</th>
            <th className="font-medium py-2">בריאותי</th>
            <th className="font-medium py-2">פרטים רפואיים</th>
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
              <td className="py-3 pl-3 max-w-[220px] text-pine-dark/80 whitespace-pre-line break-words">
                {s.health_notes ? (
                  <span className="text-clay font-medium">{s.health_notes}</span>
                ) : (
                  <span className="text-pine-dark/40">—</span>
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownload(s)}
                    disabled={downloadingId === s.id || deletingId === s.id}
                    className="flex items-center gap-1.5 text-pine hover:text-amber-dark transition-colors text-sm disabled:opacity-50"
                  >
                    {downloadingId === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    PDF
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    disabled={deletingId === s.id || downloadingId === s.id}
                    title="מחק הגשה"
                    className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
