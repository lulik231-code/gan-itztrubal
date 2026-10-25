"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, CheckCircle2, XCircle, Trash2, Unlock, Lock } from "lucide-react";
import { getSignedPdfUrl, deleteSubmissionAction, setEditAccessAction } from "./pdfActions";
import type { SubmissionWithRelations } from "@/types";

function formatDateTimeHebrew(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function todayInIsrael(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

export function SubmissionsTable({
  submissions,
  eventDate,
  openChildIds,
}: {
  submissions: SubmissionWithRelations[];
  eventDate: string | null;
  openChildIds: string[];
}) {
  const [accessBusyId, setAccessBusyId] = useState<string | null>(null);
  // Editing is locked for parents from the event day onward.
  const lockedByDate = !!eventDate && todayInIsrael() >= eventDate;

  async function handleToggleAccess(submission: SubmissionWithRelations, enable: boolean) {
    if (!submission.children?.id) return;
    setAccessBusyId(submission.id);
    try {
      const result = await setEditAccessAction(submission.event_id, submission.children.id, enable);
      if (!result.success) alert("שגיאה בעדכון ההרשאה. נסי שוב.");
      else router.refresh();
    } finally {
      setAccessBusyId(null);
    }
  }

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
    // Open the tab synchronously, inside the click, so mobile pop-up blockers
    // allow it; the signed link is filled in once the server returns it.
    const win = window.open("", "_blank");
    try {
      const url = await getSignedPdfUrl(submission.pdf_storage_path);
      if (!url) {
        win?.close();
        alert("שגיאה בהורדת הקובץ. נסו שוב.");
      } else if (win) {
        win.location.href = url;
      } else {
        // Pop-ups blocked entirely: open the PDF in this tab instead.
        window.location.href = url;
      }
    } catch {
      win?.close();
      alert("שגיאה בהורדת הקובץ. נסו שוב.");
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
                {formatDateTimeHebrew(s.edited_at ?? s.submitted_at)}
                {s.edited_at && (
                  <span className="block text-xs text-amber-dark">עודכן על ידי ההורה</span>
                )}
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
                  {(() => {
                    const childId = s.children?.id;
                    if (!childId) return null;
                    const isOpen = openChildIds.includes(childId);
                    // Before the event day parents can already edit; the button matters from then on.
                    if (!lockedByDate && !isOpen) return null;
                    return (
                      <button
                        onClick={() => handleToggleAccess(s, !isOpen)}
                        disabled={accessBusyId === s.id}
                        title={isOpen ? "סגירת עריכה להורה" : "פתיחת עריכה להורה"}
                        className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
                          isOpen ? "text-amber-dark hover:text-pine" : "text-pine hover:text-amber-dark"
                        }`}
                      >
                        {accessBusyId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isOpen ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        {isOpen ? "עריכה פתוחה" : "פתיחת עריכה"}
                      </button>
                    );
                  })()}
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
