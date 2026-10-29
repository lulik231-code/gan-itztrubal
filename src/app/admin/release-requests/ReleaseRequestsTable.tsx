"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Trash2 } from "lucide-react";
import { getSignedPdfUrl } from "../events/[eventId]/pdfActions";
import { deleteReleaseRequestAction } from "./actions";
import { formatReleaseDate } from "@/lib/earlyRelease";
import type { ReleaseRequest } from "@/types";

export function ReleaseRequestsTable({ requests }: { requests: ReleaseRequest[] }) {
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDownload(r: ReleaseRequest) {
    setDownloadingId(r.id);
    // Open the tab inside the click so mobile pop-up blockers allow it.
    const win = window.open("", "_blank");
    try {
      const url = await getSignedPdfUrl(r.pdf_storage_path);
      if (!url) {
        win?.close();
        alert("שגיאה בהורדת הקובץ. נסו שוב.");
      } else if (win) {
        win.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      win?.close();
      alert("שגיאה בהורדת הקובץ. נסו שוב.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(r: ReleaseRequest) {
    const name = r.children?.full_name ?? "הטופס";
    if (!confirm(`למחוק את טופס השחרור של ${name}?\nהפעולה אינה ניתנת לביטול.`)) return;
    setDeletingId(r.id);
    try {
      const result = await deleteReleaseRequestAction(r.id, r.pdf_storage_path);
      if (!result.success) alert("שגיאה במחיקה. נסי שוב.");
      else router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (requests.length === 0) {
    return <p className="text-sm text-pine-dark/60 py-6 text-center">עדיין לא הוגשו טפסים.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="border-b border-line text-pine-dark/60 text-right">
            <th className="font-medium py-2 pr-2">תאריך</th>
            <th className="font-medium py-2">שעות</th>
            <th className="font-medium py-2">ילד/ה</th>
            <th className="font-medium py-2">הפונה</th>
            <th className="font-medium py-2">נאסף על ידי</th>
            <th className="font-medium py-2">סיבה</th>
            <th className="font-medium py-2"></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-line/60 hover:bg-sage-light/50 align-top">
              <td className="py-3 pr-2 font-medium text-pine-dark whitespace-nowrap">
                {formatReleaseDate(r.request_date)}
              </td>
              <td className="py-3 text-pine-dark/80 whitespace-nowrap" dir="ltr">{r.from_time} - {r.to_time}</td>
              <td className="py-3 font-medium text-pine-dark">
                {r.children?.full_name ?? "—"}
                {r.children?.class_name && (
                  <span className="block text-xs font-normal text-pine-dark/50">{r.children.class_name}</span>
                )}
              </td>
              <td className="py-3 text-pine-dark/80">
                {r.parent_full_name}
                <span className="block text-xs text-pine-dark/50">{r.parent_relation}</span>
              </td>
              <td className="py-3 text-pine-dark/80">
                {r.pickup_name}
                <span className="block text-xs text-pine-dark/50" dir="ltr">{r.pickup_phone}</span>
              </td>
              <td className="py-3 text-pine-dark/80 max-w-[200px] whitespace-pre-line break-words">{r.reason}</td>
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownload(r)}
                    disabled={downloadingId === r.id || deletingId === r.id}
                    className="flex items-center gap-1.5 text-pine hover:text-amber-dark transition-colors text-sm disabled:opacity-50"
                  >
                    {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    PDF
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={deletingId === r.id || downloadingId === r.id}
                    title="מחק"
                    className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
