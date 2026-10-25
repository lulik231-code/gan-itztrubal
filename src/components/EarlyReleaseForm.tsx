"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarDays } from "lucide-react";
import { Card, Field, Input, CheckboxRow } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ChildPicker } from "@/components/ChildPicker";
import { SignaturePad, SignaturePadHandle } from "@/components/SignaturePad";
import {
  EARLY_RELEASE_INTRO,
  EARLY_RELEASE_CLAUSES,
  ID_NUMBER_PATTERN,
  formatReleaseDate,
  todayInIsrael,
} from "@/lib/earlyRelease";
import type { Child } from "@/types";

type Errors = Partial<Record<
  | "child" | "parentFullName" | "parentIdNumber" | "parentPhone" | "childIdNumber" | "releaseTime"
  | "pickupName" | "pickupIdNumber" | "pickupRelation" | "pickupPhone" | "clauses" | "signature",
  string
>>;

const stripSeparators = (v: string) => v.replace(/[\s-]/g, "");

export function EarlyReleaseForm({ childRoster }: { childRoster: Child[] }) {
  const router = useRouter();
  const sigPadRef = useRef<SignaturePadHandle>(null);

  const [child, setChild] = useState<Child | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [parentFullName, setParentFullName] = useState("");
  const [parentIdNumber, setParentIdNumber] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [childIdNumber, setChildIdNumber] = useState("");
  const [releaseTime, setReleaseTime] = useState("");
  const [pickupName, setPickupName] = useState("");
  const [pickupIdNumber, setPickupIdNumber] = useState("");
  const [pickupRelation, setPickupRelation] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [clauses, setClauses] = useState<boolean[]>(() => EARLY_RELEASE_CLAUSES.map(() => false));

  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date is today in Israel; set after mount to avoid a server/browser mismatch.
  useEffect(() => setToday(todayInIsrael()), []);

  function validate(): boolean {
    const e: Errors = {};
    const phoneOk = (p: string) => /^0\d{8,9}$/.test(stripSeparators(p));
    if (!child) e.child = "יש לבחור ילד/ה";
    if (!parentFullName.trim()) e.parentFullName = "שדה חובה";
    if (!ID_NUMBER_PATTERN.test(stripSeparators(parentIdNumber))) e.parentIdNumber = "מספר תעודת זהות לא תקין";
    if (!parentPhone.trim()) e.parentPhone = "שדה חובה";
    else if (!phoneOk(parentPhone)) e.parentPhone = "מספר טלפון לא תקין";
    if (!ID_NUMBER_PATTERN.test(stripSeparators(childIdNumber))) e.childIdNumber = "מספר תעודת זהות לא תקין";
    if (!releaseTime) e.releaseTime = "יש לבחור שעה";
    if (!pickupName.trim()) e.pickupName = "שדה חובה";
    if (!ID_NUMBER_PATTERN.test(stripSeparators(pickupIdNumber))) e.pickupIdNumber = "מספר תעודת זהות לא תקין";
    if (!pickupRelation.trim()) e.pickupRelation = "שדה חובה";
    if (!pickupPhone.trim()) e.pickupPhone = "שדה חובה";
    else if (!phoneOk(pickupPhone)) e.pickupPhone = "מספר טלפון לא תקין";
    if (!clauses.every(Boolean)) e.clauses = "יש לאשר כל סעיף בהצהרה כדי להמשיך";
    if (sigPadRef.current?.isEmpty()) e.signature = "יש לחתום בתחתית הטופס";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitError(null);
    if (!validate() || !child) {
      document.getElementById("early-release-first-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const signatureDataUrl = sigPadRef.current?.getSignatureDataUrl();
    if (!signatureDataUrl) {
      setErrors((p) => ({ ...p, signature: "יש לחתום בתחתית הטופס" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit-early-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: child.id,
          form: {
            teacherName,
            parentFullName,
            parentIdNumber,
            parentPhone,
            childIdNumber,
            releaseTime,
            pickupName,
            pickupIdNumber,
            pickupRelation,
            pickupPhone,
            clausesChecked: clauses.every(Boolean),
            signatureDataUrl,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "אירעה שגיאה. נסו שוב.");
        setIsSubmitting(false);
        return;
      }
      const params = new URLSearchParams({
        child: child.full_name,
        time: releaseTime,
        date: formatReleaseDate(data.releaseDate),
      });
      router.push(`/early-release/success?${params.toString()}`);
    } catch {
      setSubmitError("שגיאת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.");
      setIsSubmitting(false);
    }
  }

  const firstErrorKey = Object.keys(errors)[0];
  const errAnchor = (k: string) => (k === firstErrorKey ? "early-release-first-error" : undefined);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-display text-pine">אישור שחרור מוקדם מהגן</h2>
        <div className="flex items-center gap-1.5 text-sm text-pine-dark/70 mt-2">
          <CalendarDays className="h-4 w-4" />
          <span>תאריך השחרור: היום{today ? `, ${formatReleaseDate(today)}` : ""}</span>
        </div>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <div id={errAnchor("child")}>
          <Field label="בחירת ילד/ה" required error={errors.child}>
            <ChildPicker childRoster={childRoster} selectedChild={child} onSelect={setChild} />
          </Field>
        </div>
        <div id={errAnchor("childIdNumber")}>
          <Field label="ת.ז. הילד/ה" required error={errors.childIdNumber}>
            <Input
              inputMode="numeric"
              value={childIdNumber}
              onChange={(e) => setChildIdNumber(e.target.value)}
              dir="ltr"
            />
          </Field>
        </div>
        <Field label="אל: גננת הגן וצוות הגן (שם הגננת, רשות)">
          <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
        </Field>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-pine mb-4">פרטי ההורה/האפוטרופוס</h3>
        <div className="flex flex-col gap-4">
          <div id={errAnchor("parentFullName")}>
            <Field label="שם מלא" required error={errors.parentFullName}>
              <Input value={parentFullName} onChange={(e) => setParentFullName(e.target.value)} />
            </Field>
          </div>
          <div id={errAnchor("parentIdNumber")}>
            <Field label="ת.ז." required error={errors.parentIdNumber}>
              <Input
                inputMode="numeric"
                value={parentIdNumber}
                onChange={(e) => setParentIdNumber(e.target.value)}
                dir="ltr"
              />
            </Field>
          </div>
          <div id={errAnchor("parentPhone")}>
            <Field label="טלפון נייד" required error={errors.parentPhone}>
              <Input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="050-1234567"
                dir="ltr"
              />
            </Field>
          </div>
        </div>
        <p className="text-sm text-pine-dark/80 leading-relaxed mt-5">
          {EARLY_RELEASE_INTRO.replace("{child}", child?.full_name ?? "______").replace(
            "{childId}",
            childIdNumber.trim() || "______"
          )}
        </p>
      </Card>

      <Card className="p-5">
        <div id={errAnchor("releaseTime")}>
          <Field label="שעת השחרור (שחרור חד-פעמי, בתאריך של היום)" required error={errors.releaseTime}>
            <Input type="time" value={releaseTime} onChange={(e) => setReleaseTime(e.target.value)} dir="ltr" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-pine mb-1">זהות המבוגר המאסף</h3>
        <p className="text-sm text-pine-dark/60 mb-4">הילד/ה ישוחרר/ת אך ורק לידי:</p>
        <div className="flex flex-col gap-4">
          <div id={errAnchor("pickupName")}>
            <Field label="שם מלא" required error={errors.pickupName}>
              <Input value={pickupName} onChange={(e) => setPickupName(e.target.value)} />
            </Field>
          </div>
          <div id={errAnchor("pickupIdNumber")}>
            <Field label="ת.ז." required error={errors.pickupIdNumber}>
              <Input
                inputMode="numeric"
                value={pickupIdNumber}
                onChange={(e) => setPickupIdNumber(e.target.value)}
                dir="ltr"
              />
            </Field>
          </div>
          <div id={errAnchor("pickupRelation")}>
            <Field label="קשר משפחתי/קרבה" required error={errors.pickupRelation}>
              <Input
                value={pickupRelation}
                onChange={(e) => setPickupRelation(e.target.value)}
                placeholder="לדוגמה: סבתא"
              />
            </Field>
          </div>
          <div id={errAnchor("pickupPhone")}>
            <Field label="טלפון" required error={errors.pickupPhone}>
              <Input
                type="tel"
                value={pickupPhone}
                onChange={(e) => setPickupPhone(e.target.value)}
                dir="ltr"
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-pine mb-1">הצהרת אחריות ופטור מתביעות</h3>
        <p className="text-sm text-pine-dark/60 mb-4">יש לאשר כל סעיף בנפרד.</p>
        <div id={errAnchor("clauses")} className="flex flex-col gap-3">
          {EARLY_RELEASE_CLAUSES.map((clause, i) => (
            <CheckboxRow
              key={i}
              id={`release-clause-${i}`}
              checked={clauses[i]}
              onChange={(v) => setClauses((prev) => prev.map((c, j) => (j === i ? v : c)))}
              required
              error={!!errors.clauses && !clauses[i]}
            >
              {`${i + 1}. ${clause}`}
            </CheckboxRow>
          ))}
        </div>
        {errors.clauses && <p className="text-sm text-clay mt-3">{errors.clauses}</p>}
      </Card>

      <Card className="p-5">
        <div id={errAnchor("signature")}>
          <h3 className="font-medium text-pine mb-1">חתימת ההורה</h3>
          <p className="text-sm text-pine-dark/60 mb-3">חתמו באמצעות האצבע (במסך מגע) או העכבר</p>
          <SignaturePad ref={sigPadRef} error={!!errors.signature} />
          {errors.signature && <p className="text-sm text-clay mt-2">{errors.signature}</p>}
        </div>
      </Card>

      {submitError && (
        <div className="rounded-xl border border-clay bg-clay/10 px-4 py-3 text-sm text-clay">{submitError}</div>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="flex items-center justify-center gap-2">
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "שולח ויוצר מסמך..." : "אישור וחתימה על הטופס"}
      </Button>
    </form>
  );
}
