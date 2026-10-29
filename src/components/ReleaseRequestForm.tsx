"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ChildPicker } from "@/components/ChildPicker";
import { SignaturePad, SignaturePadHandle } from "@/components/SignaturePad";
import { formatReleaseDate, todayInIsrael } from "@/lib/earlyRelease";
import { DEFAULT_KINDERGARTEN_NAME, REASON_MAX_LENGTH, RELEASE_REQUEST_TITLE } from "@/lib/releaseRequest";
import type { Child } from "@/types";

type Errors = Partial<Record<
  | "child" | "teacherName" | "kindergartenName" | "requestDate" | "fromTime" | "toTime" | "parentFullName"
  | "parentRelation" | "pickupName" | "pickupPhone" | "reason" | "signature",
  string
>>;

const stripSeparators = (v: string) => v.replace(/[\s-]/g, "");

export function ReleaseRequestForm({ childRoster, teachers }: { childRoster: Child[]; teachers: string[] }) {
  const router = useRouter();
  const sigPadRef = useRef<SignaturePadHandle>(null);

  const [child, setChild] = useState<Child | null>(null);
  const [today, setToday] = useState<string>("");
  const [teacherName, setTeacherName] = useState("");
  const [kindergartenName, setKindergartenName] = useState(DEFAULT_KINDERGARTEN_NAME);
  const [requestDate, setRequestDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [parentFullName, setParentFullName] = useState("");
  const [parentRelation, setParentRelation] = useState("");
  const [pickupName, setPickupName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [reason, setReason] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set after mount to avoid a server/browser mismatch.
  useEffect(() => {
    const t = todayInIsrael();
    setToday(t);
    setRequestDate((d) => d || t);
  }, []);

  function validate(): boolean {
    const e: Errors = {};
    if (!child) e.child = "יש לבחור ילד/ה";
    if (!teacherName.trim()) e.teacherName = "שדה חובה";
    if (!kindergartenName.trim()) e.kindergartenName = "שדה חובה";
    if (!requestDate || (today && requestDate < today)) e.requestDate = "יש לבחור תאריך מהיום והלאה";
    if (!fromTime) e.fromTime = "יש לבחור שעה";
    if (!toTime) e.toTime = "יש לבחור שעה";
    else if (fromTime && toTime <= fromTime) e.toTime = "שעת הסיום חייבת להיות אחרי שעת ההתחלה";
    if (!parentFullName.trim()) e.parentFullName = "שדה חובה";
    if (!parentRelation.trim()) e.parentRelation = "שדה חובה";
    if (!pickupName.trim()) e.pickupName = "שדה חובה";
    if (!pickupPhone.trim()) e.pickupPhone = "שדה חובה";
    else if (!/^0\d{8,9}$/.test(stripSeparators(pickupPhone))) e.pickupPhone = "מספר טלפון לא תקין";
    if (!reason.trim()) e.reason = "שדה חובה";
    if (sigPadRef.current?.isEmpty()) e.signature = "יש לחתום בתחתית הטופס";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitError(null);
    if (!validate() || !child) {
      document.getElementById("release-request-first-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const signatureDataUrl = sigPadRef.current?.getSignatureDataUrl();
    if (!signatureDataUrl) {
      setErrors((p) => ({ ...p, signature: "יש לחתום בתחתית הטופס" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit-release-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: child.id,
          form: {
            teacherName, kindergartenName, requestDate, fromTime, toTime, parentFullName,
            parentRelation, pickupName, pickupPhone, reason, signatureDataUrl,
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
        date: formatReleaseDate(requestDate),
        from: fromTime,
        to: toTime,
      });
      router.push(`/release-request/success?${params.toString()}`);
    } catch {
      setSubmitError("שגיאת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.");
      setIsSubmitting(false);
    }
  }

  const firstErrorKey = Object.keys(errors)[0];
  const errAnchor = (k: string) => (k === firstErrorKey ? "release-request-first-error" : undefined);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-display text-pine">{RELEASE_REQUEST_TITLE}</h2>
        <p className="text-sm text-pine-dark/60 mt-1">
          המסמך שיווצר הוא בנוסח טופס משרד החינוך, וניתן להוריד אותו כקובץ PDF.
        </p>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <div id={errAnchor("child")}>
          <Field label="בחירת ילד/ה" required error={errors.child}>
            <ChildPicker childRoster={childRoster} selectedChild={child} onSelect={setChild} />
          </Field>
        </div>
        <div id={errAnchor("teacherName")}>
          <Field label="אל הגננת" required error={errors.teacherName}>
            {teachers.length > 0 ? (
              <select
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full rounded-lg border border-line bg-card px-4 py-2.5 text-pine-dark focus:border-amber focus:outline-none"
              >
                <option value="">בחרו את הגננת</option>
                {teachers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
            )}
          </Field>
        </div>
        <div id={errAnchor("kindergartenName")}>
          <Field label="בגן" required error={errors.kindergartenName}>
            <Input value={kindergartenName} onChange={(e) => setKindergartenName(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <h3 className="font-medium text-pine">מועד היציאה</h3>
        <div id={errAnchor("requestDate")}>
          <Field label="בתאריך" required error={errors.requestDate}>
            <Input
              type="date"
              value={requestDate}
              min={today || undefined}
              onChange={(e) => setRequestDate(e.target.value)}
              dir="ltr"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div id={errAnchor("fromTime")}>
            <Field label="משעה" required error={errors.fromTime}>
              <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} dir="ltr" />
            </Field>
          </div>
          <div id={errAnchor("toTime")}>
            <Field label="עד שעה" required error={errors.toTime}>
              <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} dir="ltr" />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <h3 className="font-medium text-pine">הפונה</h3>
        <div id={errAnchor("parentFullName")}>
          <Field label="שם הפונה" required error={errors.parentFullName}>
            <Input value={parentFullName} onChange={(e) => setParentFullName(e.target.value)} />
          </Field>
        </div>
        <div id={errAnchor("parentRelation")}>
          <Field label="קרבת משפחה" required error={errors.parentRelation}>
            <Input
              value={parentRelation}
              onChange={(e) => setParentRelation(e.target.value)}
              placeholder="לדוגמה: אמא"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <h3 className="font-medium text-pine">מי ייקח את הילד/ה</h3>
        <div id={errAnchor("pickupName")}>
          <Field label="שם האדם שיקח/תיקח את הילד/ה" required error={errors.pickupName}>
            <Input value={pickupName} onChange={(e) => setPickupName(e.target.value)} />
          </Field>
        </div>
        <div id={errAnchor("pickupPhone")}>
          <Field label="מספר טלפון" required error={errors.pickupPhone}>
            <Input type="tel" value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} dir="ltr" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div id={errAnchor("reason")}>
          <Field label="הסיבה לבקשה" required error={errors.reason}>
            <Textarea
              rows={3}
              value={reason}
              maxLength={REASON_MAX_LENGTH}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div id={errAnchor("signature")}>
          <h3 className="font-medium text-pine mb-1">חתימת ההורה הפונה</h3>
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
