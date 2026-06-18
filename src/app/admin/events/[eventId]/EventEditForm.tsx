"use client";

import { useState, useEffect } from "react";
import { Card, Field, Input, Textarea, CheckboxRow } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { updateEventAction, deleteEventAction } from "../actions";
import type { Event } from "@/types";
import { Trash2, Check } from "lucide-react";

export function EventEditForm({ event }: { event: Event }) {
  const [requiresHealth, setRequiresHealth] = useState(event.requires_health_declaration);
  const [isActive, setIsActive] = useState(event.is_active);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Auto-hide the "saved" checkmark a few seconds after it appears.
  useEffect(() => {
    if (!showSaved) return;
    const timer = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [showSaved]);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    const result = await updateEventAction(event.id, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setShowSaved(true);
    }
    setIsSubmitting(false);
  }

  return (
    <Card className="p-5">
      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-pine-dark">פרטי האירוע</h2>
          <CheckboxRow id="is_active" checked={isActive} onChange={setIsActive}>
            אירוע פעיל (גלוי להורים)
          </CheckboxRow>
        </div>
        <input type="hidden" name="is_active" value={isActive ? "on" : "off"} />

        <Field label="שם האירוע" required>
          <Input name="title" defaultValue={event.title} required />
        </Field>
        <Field label="תיאור האירוע">
          <Textarea name="description" defaultValue={event.description ?? ""} />
        </Field>
        <Field label="תאריך האירוע">
          <Input type="date" name="event_date" defaultValue={event.event_date ?? ""} dir="ltr" />
        </Field>
        <Field label="טקסט הצהרת ההסכמה" required>
          <Textarea name="consent_text" defaultValue={event.consent_text} className="min-h-[110px]" />
        </Field>
        <CheckboxRow
          id="requires_health_declaration"
          checked={requiresHealth}
          onChange={setRequiresHealth}
        >
          דרוש אישור הצהרה בריאותית נפרדת בטופס
        </CheckboxRow>
        <input type="hidden" name="requires_health_declaration" value={requiresHealth ? "on" : "off"} />

        {error && (
          <div className="rounded-xl border border-clay bg-clay/10 px-4 py-3 text-sm text-clay">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {showSaved && <Check className="h-4 w-4" />}
            {isSubmitting ? "שומר..." : "שמירת שינויים"}
          </Button>

          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-clay">למחוק לצמיתות?</span>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={() => deleteEventAction(event.id)}
              >
                כן, מחק
              </Button>
              <Button type="button" variant="ghost" size="md" onClick={() => setConfirmingDelete(false)}>
                ביטול
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1.5 text-sm text-clay hover:text-clay/80 transition-colors px-2"
            >
              <Trash2 className="h-4 w-4" />
              מחיקת אירוע
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
