"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { formatReleaseDate } from "@/lib/earlyRelease";
import type { SubmissionWithRelations, EarlyRelease, Event } from "@/types";

export interface ExportFile {
  name: string; // file name inside the ZIP
  url: string; // short-lived signed download link
}

export type ExportResult =
  | { ok: true; zipName: string; files: ExportFile[]; csv: string }
  | { ok: false; error: string };

// ---------- helpers ----------

/** Strips characters that are not allowed in file names. */
function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "ללא שם";
}

/** Makes names unique inside the ZIP: "name.pdf", "name (2).pdf", ... */
function uniqueNames(base: string[]): string[] {
  const seen = new Map<string, number>();
  return base.map((b) => {
    const n = (seen.get(b) ?? 0) + 1;
    seen.set(b, n);
    return n === 1 ? `${b}.pdf` : `${b} (${n}).pdf`;
  });
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** UTF-8 with BOM so Excel opens Hebrew correctly. */
function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n");
}

function israelDateTime(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(iso));
}

async function signAll(paths: string[]): Promise<(string | null)[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("consent-pdfs").createSignedUrls(paths, 60 * 15);
  if (error || !data) {
    console.error("createSignedUrls error:", error);
    return paths.map(() => null);
  }
  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return paths.map((p) => byPath.get(p) ?? null);
}

// ---------- all signed forms of one event ----------

export async function getEventExportAction(eventId: string): Promise<ExportResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single<Event>();
  if (!event) return { ok: false, error: "האירוע לא נמצא." };

  const { data: subs } = await supabase
    .from("submissions")
    .select("*, children(id, full_name, class_name)")
    .eq("event_id", eventId)
    .order("submitted_at", { ascending: true })
    .returns<SubmissionWithRelations[]>();
  if (!subs || subs.length === 0) return { ok: false, error: "אין אישורים להורדה באירוע זה." };

  const urls = await signAll(subs.map((s) => s.pdf_storage_path));
  const names = uniqueNames(subs.map((s) => safeName(s.children?.full_name ?? "ילד")));

  const files: ExportFile[] = [];
  subs.forEach((_, i) => {
    const url = urls[i];
    if (url) files.push({ name: names[i], url });
  });
  if (files.length === 0) return { ok: false, error: "שגיאה ביצירת קישורי ההורדה." };

  const csv = toCsv(
    ["שם הילד/ה", "כיתה", "הורה חותם/ת", "טלפון", "ת.ז. הורה", "פרטים רפואיים", "הערות", "אישור צילום", "תאריך הגשה", "עודכן על ידי ההורה", "שם הקובץ"],
    subs.map((s, i) => [
      s.children?.full_name,
      s.children?.class_name,
      s.parent_full_name,
      s.parent_phone,
      s.parent_id_number,
      s.health_notes,
      s.notes,
      s.photo_consent_checked === null ? "" : s.photo_consent_checked ? "כן" : "לא",
      israelDateTime(s.submitted_at),
      s.edited_at ? israelDateTime(s.edited_at) : "",
      names[i],
    ])
  );

  const dateLabel = event.event_date ? ` ${formatReleaseDate(event.event_date)}` : "";
  return { ok: true, zipName: safeName(`${event.title}${dateLabel}`), files, csv };
}

// ---------- all early releases of one month ----------

export async function getEarlyReleaseMonthExportAction(month: string): Promise<ExportResult> {
  await requireAdmin();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, error: "חודש לא תקין." };

  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("early_releases")
    .select("*, children(id, full_name, class_name)")
    .gte("release_date", start)
    .lt("release_date", next)
    .order("release_date", { ascending: true })
    .order("release_time", { ascending: true })
    .returns<EarlyRelease[]>();
  if (!rows || rows.length === 0) return { ok: false, error: "אין שחרורים מוקדמים בחודש זה." };

  const urls = await signAll(rows.map((r) => r.pdf_storage_path));
  const names = uniqueNames(
    rows.map((r) => safeName(`${formatReleaseDate(r.release_date).replace(/\./g, "-")} ${r.release_time.replace(":", "-")} ${r.children?.full_name ?? "ילד"}`))
  );

  const files: ExportFile[] = [];
  rows.forEach((_, i) => {
    const url = urls[i];
    if (url) files.push({ name: names[i], url });
  });
  if (files.length === 0) return { ok: false, error: "שגיאה ביצירת קישורי ההורדה." };

  const csv = toCsv(
    ["תאריך", "שעה", "שם הילד/ה", "כיתה", "ת.ז. ילד/ה", "גננת", "הורה", "ת.ז. הורה", "טלפון הורה", "מבוגר מאסף", "קרבה", "טלפון מאסף", "שם הקובץ"],
    rows.map((r, i) => [
      formatReleaseDate(r.release_date),
      r.release_time,
      r.children?.full_name,
      r.children?.class_name,
      r.child_id_number,
      r.teacher_name,
      r.parent_full_name,
      r.parent_id_number,
      r.parent_phone,
      r.pickup_name,
      r.pickup_relation,
      r.pickup_phone,
      names[i],
    ])
  );

  return { ok: true, zipName: `שחרורים מוקדמים ${String(m).padStart(2, "0")}-${y}`, files, csv };
}
