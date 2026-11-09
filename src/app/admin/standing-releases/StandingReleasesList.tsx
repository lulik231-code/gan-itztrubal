"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Paperclip, Trash2, Upload, CheckCircle2, Clock, Undo2, Link2, Copy, MessageCircle, Ban } from "lucide-react";
import { getSignedPdfUrl } from "../events/[eventId]/pdfActions";
import {
  deleteStandingReleaseAction,
  reopenStandingReleaseAction,
  createInspectorLinkAction,
  revokeInspectorLinkAction,
} from "./actions";
import { formatReleaseDate } from "@/lib/earlyRelease";
import { releaseTypeLabel, scheduleShort } from "@/lib/standingRelease";
import type { StandingRelease } from "@/types";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(iso));
}

export function StandingReleasesList({ items }: { items: StandingRelease[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const linkFor = (token: string) => `${window.location.origin}/inspector/${token}`;
  const isActive = (r: StandingRelease) =>
    !!r.inspector_token && !!r.inspector_token_expires_at && new Date(r.inspector_token_expires_at) > new Date();

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2500);
  }

  async function createLink(r: StandingRelease) {
    setBusy(`ln-${r.id}`);
    try {
      const result = await createInspectorLinkAction(r.id, 14);
      if (!result.success || !result.token) {
        alert("שגיאה ביצירת הקישור. נסי שוב.");
        return;
      }
      await copyText(r.id, linkFor(result.token));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function revokeLink(r: StandingRelease) {
    if (!confirm("לבטל את הקישור? מי שמחזיק בו לא יוכל יותר לפתוח את הטופס.")) return;
    setBusy(`ln-${r.id}`);
    try {
      const result = await revokeInspectorLinkAction(r.id);
      if (!result.success) alert("שגיאה בביטול הקישור. נסי שוב.");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  // The tab is opened inside the click so mobile pop-up blockers allow it.
  async function openFile(key: string, path: string) {
    setBusy(key);
    const win = window.open("", "_blank");
    try {
      const url = await getSignedPdfUrl(path);
      if (!url) {
        win?.close();
        alert("שגיאה בפתיחת הקובץ. נסו שוב.");
      } else if (win) {
        win.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      win?.close();
      alert("שגיאה בפתיחת הקובץ. נסו שוב.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadSigned(id: string, file: File | undefined) {
    if (!file) return;
    setBusy(`up-${id}`);
    try {
      const fd = new FormData();
      fd.append("id", id);
      fd.append("file", file);
      const res = await fetch("/api/admin/standing-release-signed", { method: "POST", body: fd });
      let data: { error?: string } = {};
      try { data = await res.json(); } catch { /* request rejected by the host */ }
      if (!res.ok) alert(data.error ?? "שגיאה בהעלאה. אם הקובץ גדול, נסו לכווץ אותו.");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(r: StandingRelease) {
    const name = r.children?.full_name ?? "הטופס";
    if (!confirm(`למחוק את טופס השחרור הקבוע של ${name}, כולל כל המסמכים?\nהפעולה אינה ניתנת לביטול.`)) return;
    setBusy(`del-${r.id}`);
    try {
      const result = await deleteStandingReleaseAction(r.id);
      if (!result.success) alert("שגיאה במחיקה. נסי שוב.");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleReopen(r: StandingRelease) {
    if (!confirm("להחזיר את הטופס למצב ממתין לאישור המפקחת?")) return;
    setBusy(`re-${r.id}`);
    try {
      const result = await reopenStandingReleaseAction(r.id);
      if (!result.success) alert("שגיאה בעדכון. נסי שוב.");
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-pine-dark/60 py-6 text-center">אין טפסים בקטגוריה זו.</p>;
  }

  const btn = "flex items-center gap-1.5 text-pine hover:text-amber-dark transition-colors text-sm disabled:opacity-50";

  return (
    <ul className="flex flex-col gap-3">
      {items.map((r) => (
        <li key={r.id} className="rounded-xl border border-line p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-pine-dark">
                {r.children?.full_name ?? "—"}
                {r.children?.class_name && (
                  <span className="text-xs font-normal text-pine-dark/50 mr-2">{r.children.class_name}</span>
                )}
              </p>
              <p className="text-sm text-pine-dark/70 mt-0.5">
                {releaseTypeLabel(r.release_type)}
                {r.reason_text ? `: ${r.reason_text}` : ""}
              </p>
              <p className="text-sm text-pine-dark/70 mt-0.5">
                ימים ושעות: <span dir="ltr">{scheduleShort(r.schedule ?? [])}</span>, החל מ-{formatReleaseDate(r.start_date)}
              </p>
              <p className="text-xs text-pine-dark/50 mt-0.5">
                {r.parent1_name}
                {r.parent2_name ? ` ו${r.parent2_name}` : ""} · הוגש {formatDate(r.submitted_at)}
              </p>
              {r.notes && <p className="text-sm text-pine-dark/80 mt-1 whitespace-pre-line">הערות: {r.notes}</p>}
            </div>
            {r.status === "approved" ? (
              <span className="flex items-center gap-1.5 text-sm text-pine bg-sage-light rounded-full px-3 py-1">
                <CheckCircle2 className="h-4 w-4" />
                אושר{r.approved_at ? ` ${formatDate(r.approved_at)}` : ""}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-amber-dark bg-amber/10 rounded-full px-3 py-1">
                <Clock className="h-4 w-4" />
                ממתין לאישור המפקחת
              </span>
            )}
          </div>

          <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
            <button className={btn} disabled={busy === `pk-${r.id}`} onClick={() => openFile(`pk-${r.id}`, r.package_storage_path)}>
              {busy === `pk-${r.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {r.attachments.length > 0 ? "טופס + מסמכים (לשליחה למפקחת)" : "טופס PDF (לשליחה למפקחת)"}
            </button>
            {r.attachments.length > 0 && (
              <button className={btn} disabled={busy === `fm-${r.id}`} onClick={() => openFile(`fm-${r.id}`, r.pdf_storage_path)}>
                <FileText className="h-4 w-4" />
                הטופס בלבד
              </button>
            )}
            {r.attachments.map((a, i) => (
              <button key={a.path} className={btn} disabled={busy === a.path} onClick={() => openFile(a.path, a.path)} title={a.name}>
                <Paperclip className="h-4 w-4" />
                מסמך {i + 1}
              </button>
            ))}
          </div>

          {r.status === "pending" && (
            <div className="flex items-center gap-x-5 gap-y-2 flex-wrap rounded-lg bg-sage-light/40 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-pine-dark">
                <Link2 className="h-4 w-4" />
                חתימת המפקחת במערכת
              </span>
              {isActive(r) ? (
                <>
                  <span className="text-xs text-pine-dark/60">
                    קישור פעיל עד {formatDate(r.inspector_token_expires_at!)}
                  </span>
                  <button className={btn} onClick={() => copyText(r.id, linkFor(r.inspector_token!))}>
                    <Copy className="h-4 w-4" />
                    {copiedId === r.id ? "הועתק!" : "העתקת הקישור"}
                  </button>
                  <a
                    className={btn}
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `שלום, מצורף קישור לאישור וחתימה על טופס שחרור קבוע מהגן (${r.children?.full_name ?? ""}): ${linkFor(r.inspector_token!)}`
                    )}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    שליחה בוואטסאפ
                  </a>
                  <button className={btn} disabled={busy === `ln-${r.id}`} onClick={() => revokeLink(r)}>
                    <Ban className="h-4 w-4" />
                    ביטול הקישור
                  </button>
                </>
              ) : (
                <button className={btn} disabled={busy === `ln-${r.id}`} onClick={() => createLink(r)}>
                  {busy === `ln-${r.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  יצירת קישור (תקף ל-14 יום)
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-x-5 gap-y-2 flex-wrap border-t border-line/60 pt-3">
            <input
              ref={(el) => { fileInputs.current[r.id] = el; }}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                uploadSigned(r.id, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button className={btn} disabled={busy === `up-${r.id}`} onClick={() => fileInputs.current[r.id]?.click()}>
              {busy === `up-${r.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {r.signed_storage_path ? "החלפת הקובץ החתום" : "העלאת הקובץ החתום מהמפקחת"}
            </button>
            {r.signed_storage_path && (
              <button className={btn} disabled={busy === `sg-${r.id}`} onClick={() => openFile(`sg-${r.id}`, r.signed_storage_path!)}>
                <Download className="h-4 w-4" />
                הקובץ החתום
              </button>
            )}
            {r.status === "approved" && (
              <button className={btn} disabled={busy === `re-${r.id}`} onClick={() => handleReopen(r)}>
                <Undo2 className="h-4 w-4" />
                החזרה להמתנה
              </button>
            )}
            <button
              onClick={() => handleDelete(r)}
              disabled={busy === `del-${r.id}`}
              title="מחק"
              className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 mr-auto"
            >
              {busy === `del-${r.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
