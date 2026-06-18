"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Textarea, CheckboxRow } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SignaturePad, SignaturePadHandle } from "@/components/SignaturePad";
import type { Event, Child } from "@/types";
import { Loader2 } from "lucide-react";

interface ConsentFormProps {
  event: Event;
  child: Child;
}

interface FormErrors {
  parentFullName?: string;
  parentPhone?: string;
  healthDeclaration?: string;
  generalConsent?: string;
  signature?: string;
}

export function ConsentForm({ event, child }: ConsentFormProps) {
  const router = useRouter();
  const sigPadRef = useRef<SignaturePadHandle>(null);

  const [parentFullName, setParentFullName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentIdNumber, setParentIdNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [healthDeclarationChecked, setHealthDeclarationChecked] = useState(false);
  const [generalConsentChecked, setGeneralConsentChecked] = useState(false);
  const [photoConsentChecked, setPhotoConsentChecked] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!parentFullName.trim()) newErrors.parentFullName = "שדה חובה";
    if (!parentPhone.trim()) newErrors.parentPhone = "שדה חובה";
    else if (!/^0\d{8,9}$/.test(parentPhone.replace(/[-\s]/g, ""))) {
      newErrors.parentPhone = "מספר טלפון לא תקין";
    }
    if (event.requires_health_declaration && !healthDeclarationChecked) {
      newErrors.healthDeclaration = "יש לאשר את ההצהרה הבריאותית כדי להמשיך";
    }
    if (!generalConsentChecked) {
      newErrors.generalConsent = "יש לאשר את ההסכמה הכללית כדי להמשיך";
    }
    if (sigPadRef.current?.isEmpty()) {
      newErrors.signature = "יש לחתום בתחתית הטופס";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      // scroll to first error for visibility on mobile
      document.getElementById("form-errors-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const signatureDataUrl = sigPadRef.current?.getSignatureDataUrl();
    if (!signatureDataUrl) {
      setErrors((prev) => ({ ...prev, signature: "יש לחתום בתחתית הטופס" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          childId: child.id,
          form: {
            parentFullName,
            parentPhone,
            parentIdNumber,
            notes,
            healthDeclarationChecked,
            generalConsentChecked,
            photoConsentChecked: event.requires_health_declaration === null ? null : photoConsentChecked,
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

      router.push(`/event/${event.id}/success?child=${encodeURIComponent(child.full_name)}`);
    } catch {
      setSubmitError("שגיאת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="p-5">
        <h3 className="font-medium text-pine mb-4">פרטי ההורה החותם/ת</h3>
        <div className="flex flex-col gap-4">
          <Field label="שם מלא" required error={errors.parentFullName}>
            <Input
              value={parentFullName}
              onChange={(e) => setParentFullName(e.target.value)}
              placeholder="לדוגמה: דנה כהן"
            />
          </Field>
          <Field label="טלפון נייד" required error={errors.parentPhone}>
            <Input
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="050-1234567"
              dir="ltr"
            />
          </Field>
          <Field label="מספר תעודת זהות (רשות)">
            <Input
              value={parentIdNumber}
              onChange={(e) => setParentIdNumber(e.target.value)}
              placeholder="לא חובה"
              dir="ltr"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-pine mb-3">הצהרת הסכמה</h3>
        <p className="text-sm text-pine-dark/80 leading-relaxed mb-4">{event.consent_text}</p>

        <div className="flex flex-col gap-3">
          {event.requires_health_declaration && (
            <CheckboxRow
              id="health-declaration"
              checked={healthDeclarationChecked}
              onChange={setHealthDeclarationChecked}
              required
              error={!!errors.healthDeclaration}
            >
              אני מאשר/ת כי קראתי את ההצהרה הבריאותית ומסרתי את כל המידע הרפואי הרלוונטי לגבי ילדי.
            </CheckboxRow>
          )}

          <CheckboxRow
            id="general-consent"
            checked={generalConsentChecked}
            onChange={setGeneralConsentChecked}
            required
            error={!!errors.generalConsent}
          >
            אני מסכים/ה להשתתפות ילדי באירוע המתואר לעיל.
          </CheckboxRow>

          <CheckboxRow
            id="photo-consent"
            checked={photoConsentChecked}
            onChange={setPhotoConsentChecked}
          >
            אני מאשר/ת צילום ילדי לצרכי תיעוד ופרסום הגן (רשות).
          </CheckboxRow>
        </div>

        {(errors.healthDeclaration || errors.generalConsent) && (
          <p id="form-errors-anchor" className="text-sm text-clay mt-3">
            יש לאשר את כל הסעיפים המסומנים בכוכבית כדי להמשיך
          </p>
        )}
      </Card>

      <Card className="p-5">
        <Field label="הערות נוספות (לדוגמה: רגישויות, מידע רפואי נוסף)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="אופציונלי..."
          />
        </Field>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-pine mb-1">חתימה דיגיטלית</h3>
        <p className="text-sm text-pine-dark/60 mb-3">
          חתמו באמצעות האצבע (במסך מגע) או העכבר
        </p>
        <SignaturePad ref={sigPadRef} error={!!errors.signature} />
        {errors.signature && <p className="text-sm text-clay mt-2">{errors.signature}</p>}
      </Card>

      {submitError && (
        <div className="rounded-xl border border-clay bg-clay/10 px-4 py-3 text-sm text-clay">
          {submitError}
        </div>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="flex items-center justify-center gap-2">
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "שולח ויוצר מסמך..." : "אישור וחתימה על הטופס"}
      </Button>
    </form>
  );
}
