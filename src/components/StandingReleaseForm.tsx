"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, X } from "lucide-react";
import { Card, Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ChildPicker } from "@/components/ChildPicker";
import { SignaturePad, SignaturePadHandle } from "@/components/SignaturePad";
import { formatReleaseDate, todayInIsrael } from "@/lib/earlyRelease";
import { DEFAULT_KINDERGARTEN_NAME } from "@/lib/releaseRequest";
import {
  DAYS,
  EARLIEST_TIME,
  FIXED_TIME,
  RELEASE_TYPES,
  REASON_MAX_LENGTH,
  isFixedType,
  latestTimeFor,
  validateSchedule,
  type ReleaseType,
  MAX_ATTACHMENTS,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  NOTES_MAX_LENGTH,
  STANDING_RESPONSIBILITY,
  STANDING_SUBJECT,
  STANDING_TITLE,
} from "@/lib/standingRelease";
import type { Child } from "@/types";

type Errors = Partial<Record<
  "child" | "kindergartenName" | "schedule" | "reason" | "startDate" | "parent1Name" | "parent2Name" | "signature1" | "signature2" | "files",
  string
>>;

const mb = (n: number) => `${Math.round(n / 1024 / 1024)}MB`;

/** Shrinks photos taken on a phone so the upload stays small; PDFs are left untouched. */
async function prepareFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.8));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function StandingReleaseForm({ childRoster }: { childRoster: Child[] }) {
  const router = useRouter();
  const sig1Ref = useRef<SignaturePadHandle>(null);
  const sig2Ref = useRef<SignaturePadHandle>(null);

  const [child, setChild] = useState<Child | null>(null);
  const [today, setToday] = useState("");
  const [kindergartenName, setKindergartenName] = useState(DEFAULT_KINDERGARTEN_NAME);
  const [releaseType, setReleaseType] = useState<ReleaseType>("daycare");
  const [reasonText, setReasonText] = useState("");
  // day index -> time, only for the days that are ticked
  const [times, setTimes] = useState<Record<number, string>>({});
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [parent1Name, setParent1Name] = useState("");
  const [parent2Name, setParent2Name] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [preparing, setPreparing] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = todayInIsrael();
    setToday(t);
    setStartDate((d) => d || t);
  }, []);

  function chooseType(t: ReleaseType) {
    setReleaseType(t);
    setErrors((p) => ({ ...p, schedule: undefined, reason: undefined }));
    if (isFixedType(t)) {
      // Fixed 13:30, Sunday to Thursday only.
      setTimes((prev) => {
        const next: Record<number, string> = {};
        for (const d of Object.keys(prev).map(Number)) if (d !== 5) next[d] = FIXED_TIME;
        return next;
      });
    }
  }

  function toggleDay(day: number, on: boolean) {
    setErrors((p) => ({ ...p, schedule: undefined }));
    setTimes((prev) => {
      const next = { ...prev };
      if (!on) delete next[day];
      else next[day] = isFixedType(releaseType) ? FIXED_TIME : day === 5 ? "12:00" : FIXED_TIME;
      return next;
    });
  }

  const schedule = Object.keys(times).map((d) => ({ day: Number(d), time: times[Number(d)] }));

  async function handleAddFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setErrors((p) => ({ ...p, files: undefined }));
    const incoming = Array.from(list);
    if (files.length + incoming.length > MAX_ATTACHMENTS) {
      setErrors((p) => ({ ...p, files: `אפשר לצרף עד ${MAX_ATTACHMENTS} קבצים.` }));
      return;
    }
    setPreparing(true);
    const prepared: File[] = [];
    for (const f of incoming) {
      if (f.type !== "application/pdf" && !f.type.startsWith("image/")) {
        setErrors((p) => ({ ...p, files: `הקובץ "${f.name}" אינו PDF או תמונה.` }));
        setPreparing(false);
        return;
      }
      const p = await prepareFile(f);
      if (p.size > MAX_FILE_BYTES) {
        setErrors((e) => ({ ...e, files: `הקובץ "${f.name}" גדול מדי (עד ${mb(MAX_FILE_BYTES)} לקובץ).` }));
        setPreparing(false);
        return;
      }
      prepared.push(p);
    }
    const next = [...files, ...prepared];
    if (next.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) {
      setErrors((p) => ({ ...p, files: `סך כל הקבצים גדול מדי (עד ${mb(MAX_TOTAL_BYTES)}).` }));
    } else {
      setFiles(next);
    }
    setPreparing(false);
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!child) e.child = "יש לבחור ילד/ה";
    if (!kindergartenName.trim()) e.kindergartenName = "שדה חובה";
    const scheduleError = validateSchedule(releaseType, schedule);
    if (scheduleError) e.schedule = scheduleError;
    if (releaseType === "other" && !reasonText.trim()) e.reason = "יש לכתוב את סיבת השחרור";
    if (!startDate || (today && startDate < today)) e.startDate = "יש לבחור תאריך מהיום והלאה";
    if (!parent1Name.trim()) e.parent1Name = "שדה חובה";
    if (sig1Ref.current?.isEmpty()) e.signature1 = "יש לחתום";
    const has2Name = !!parent2Name.trim();
    const has2Sig = !(sig2Ref.current?.isEmpty() ?? true);
    if (has2Name && !has2Sig) e.signature2 = "יש לחתום, או למחוק את שם ההורה השני";
    if (!has2Name && has2Sig) e.parent2Name = "יש להזין את שם ההורה השני";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitError(null);
    if (!validate() || !child) {
      document.getElementById("standing-first-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const sig1 = sig1Ref.current?.getSignatureDataUrl();
    if (!sig1) {
      setErrors((p) => ({ ...p, signature1: "יש לחתום" }));
      return;
    }
    const sig2 = parent2Name.trim() ? sig2Ref.current?.getSignatureDataUrl() ?? "" : "";

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("childId", child.id);
      fd.append(
        "form",
        JSON.stringify({
          kindergartenName, releaseType, reasonText, schedule, startDate, notes,
          parent1Name, parent1Signature: sig1, parent2Name: parent2Name.trim(), parent2Signature: sig2,
        })
      );
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/submit-standing-release", { method: "POST", body: fd });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // the host rejected the request before it reached the app (usually a too large upload)
      }
      if (!res.ok) {
        setSubmitError(data.error ?? "אירעה שגיאה. אם צירפתם קבצים, נסו קבצים קטנים יותר.");
        setIsSubmitting(false);
        return;
      }
      const params = new URLSearchParams({ child: child.full_name, date: formatReleaseDate(startDate) });
      router.push(`/standing-release/success?${params.toString()}`);
    } catch {
      setSubmitError("שגיאת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.");
      setIsSubmitting(false);
    }
  }

  const firstErrorKey = Object.keys(errors)[0];
  const errAnchor = (k: string) => (k === firstErrorKey ? "standing-first-error" : undefined);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-display text-pine">{STANDING_TITLE}</h2>
        <p className="text-sm text-pine-dark/60 mt-1">
          הטופס מיועד לשחרור קבוע. לאחר החתימה שלכם הוא יועבר לאישור המפקחת.
        </p>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <div id={errAnchor("child")}>
          <Field label="בחירת ילד/ה" required error={errors.child}>
            <ChildPicker childRoster={childRoster} selectedChild={child} onSelect={setChild} />
          </Field>
        </div>
        <div id={errAnchor("kindergartenName")}>
          <Field label="שם הגן" required error={errors.kindergartenName}>
            <Input value={kindergartenName} onChange={(e) => setKindergartenName(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <p className="text-sm font-medium text-pine-dark">{STANDING_SUBJECT}</p>
        <p className="text-sm text-pine-dark/80 leading-relaxed">
          א. אני מבקש/ת לשחרר את בני/בתי {child?.full_name ?? "______"} לפני סיום יום הלימודים.
        </p>
        <div>
          <p className="text-sm font-medium text-pine-dark mb-2">סוג השחרור</p>
          <div className="flex flex-col gap-2">
            {RELEASE_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                  releaseType === t.value ? "border-pine bg-sage-light/50" : "border-line hover:border-amber"
                }`}
              >
                <input
                  type="radio"
                  name="releaseType"
                  checked={releaseType === t.value}
                  onChange={() => chooseType(t.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-pine-dark">{t.label}</span>
                  <span className="block text-xs text-pine-dark/60">{t.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {releaseType === "other" && (
          <div id={errAnchor("reason")}>
            <Field label="סיבת השחרור" required error={errors.reason}>
              <Input
                value={reasonText}
                maxLength={REASON_MAX_LENGTH}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="לדוגמה: טיפול בקלינאית תקשורת"
              />
            </Field>
          </div>
        )}

        <div id={errAnchor("schedule")}>
          <p className="text-sm font-medium text-pine-dark mb-2">
            ימי השחרור {isFixedType(releaseType) ? `(בשעה ${FIXED_TIME})` : "ושעה לכל יום"}
          </p>
          <div className="flex flex-col gap-2">
            {DAYS.map((d) => {
              const disabled = isFixedType(releaseType) && d.index === 5;
              const checked = d.index in times;
              return (
                <div
                  key={d.index}
                  className={`flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5 ${
                    disabled ? "opacity-40" : ""
                  }`}
                >
                  <label className="flex items-center gap-3 text-sm text-pine-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => toggleDay(d.index, e.target.checked)}
                    />
                    יום {d.name}
                    {disabled && <span className="text-xs text-pine-dark/60">(לא אפשרי)</span>}
                  </label>
                  {checked &&
                    (isFixedType(releaseType) ? (
                      <span className="text-sm text-pine-dark/70" dir="ltr">{FIXED_TIME}</span>
                    ) : (
                      <input
                        type="time"
                        value={times[d.index]}
                        min={EARLIEST_TIME}
                        max={latestTimeFor(d.index)}
                        onChange={(e) => {
                          setErrors((p) => ({ ...p, schedule: undefined }));
                          setTimes((prev) => ({ ...prev, [d.index]: e.target.value }));
                        }}
                        dir="ltr"
                        className="rounded-lg border border-line bg-card px-3 py-1.5 text-pine-dark focus:border-amber focus:outline-none"
                      />
                    ))}
                </div>
              );
            })}
          </div>
          {!isFixedType(releaseType) && (
            <p className="text-xs text-pine-dark/60 mt-2">
              אפשר לבחור שעה בין {EARLIEST_TIME} ל-13:30, וביום שישי בין {EARLIEST_TIME} ל-12:00.
            </p>
          )}
          {errors.schedule && <p className="text-sm text-clay mt-2">{errors.schedule}</p>}
        </div>

        <div id={errAnchor("startDate")}>
          <Field label="החל מתאריך" required error={errors.startDate}>
            <Input
              type="date"
              value={startDate}
              min={today || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              dir="ltr"
            />
          </Field>
        </div>
        <p className="text-sm text-pine-dark/80 leading-relaxed">{STANDING_RESPONSIBILITY}</p>
      </Card>

      <Card className="p-5">
        <Field label="הערות">
          <Textarea rows={3} value={notes} maxLength={NOTES_MAX_LENGTH} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <h3 className="font-medium text-pine">מסמכים מצורפים (לא חובה)</h3>
        <p className="text-sm text-pine-dark/60 -mt-2">
          עד {MAX_ATTACHMENTS} קבצים, PDF או תמונה. המפקחת תראה אותם יחד עם הטופס.
        </p>
        <div id={errAnchor("files")}>
          {files.length > 0 && (
            <ul className="flex flex-col gap-2 mb-3">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 text-pine shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-pine-dark/50 shrink-0">{(f.size / 1024).toFixed(0)}KB</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="text-pine-dark/50 hover:text-clay"
                    aria-label="הסרת הקובץ"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length < MAX_ATTACHMENTS && (
            <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm text-pine hover:border-amber transition-colors">
              {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              הוספת קובץ
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                className="hidden"
                disabled={preparing}
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {errors.files && <p className="text-sm text-clay mt-2">{errors.files}</p>}
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-5">
        <h3 className="font-medium text-pine">שמות ההורים הפונים וחתימתם</h3>
        <div className="flex flex-col gap-3">
          <div id={errAnchor("parent1Name")}>
            <Field label="1. שם ההורה" required error={errors.parent1Name}>
              <Input value={parent1Name} onChange={(e) => setParent1Name(e.target.value)} />
            </Field>
          </div>
          <div id={errAnchor("signature1")}>
            <p className="text-sm text-pine-dark/60 mb-2">חתימה (באצבע או בעכבר)</p>
            <SignaturePad ref={sig1Ref} error={!!errors.signature1} />
            {errors.signature1 && <p className="text-sm text-clay mt-2">{errors.signature1}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <div id={errAnchor("parent2Name")}>
            <Field label="2. שם ההורה השני (אם יש)" error={errors.parent2Name}>
              <Input value={parent2Name} onChange={(e) => setParent2Name(e.target.value)} />
            </Field>
          </div>
          <div id={errAnchor("signature2")}>
            <p className="text-sm text-pine-dark/60 mb-2">חתימה של ההורה השני</p>
            <SignaturePad ref={sig2Ref} error={!!errors.signature2} />
            {errors.signature2 && <p className="text-sm text-clay mt-2">{errors.signature2}</p>}
          </div>
        </div>
      </Card>

      {submitError && (
        <div className="rounded-xl border border-clay bg-clay/10 px-4 py-3 text-sm text-clay">{submitError}</div>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting || preparing} className="flex items-center justify-center gap-2">
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "שולח ויוצר מסמך..." : "אישור וחתימה על הטופס"}
      </Button>
    </form>
  );
}
