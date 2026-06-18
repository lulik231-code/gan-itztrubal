"use client";

import { useState } from "react";
import { Card, Field, Input, Textarea, CheckboxRow } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createEventAction } from "../actions";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const DEFAULT_CONSENT_TEXT =
  "אני מאשר/ת את השתתפות ילדי באירוע המתואר לעיל ומצהיר/ה כי כל הפרטים הרפואיים שמסרתי נכונים ומדויקים. ידוע לי כי הצוות יפעל בהתאם למידע שנמסר.";

export default function NewEventPage() {
  const [requiresHealth, setRequiresHealth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    const result = await createEventAction(formData);
    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-pine hover:text-amber-dark transition-colors"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה לרשימת האירועים
      </Link>

      <h2 className="text-xl font-display text-pine">אירוע חדש</h2>

      <form action={handleSubmit} className="flex flex-col gap-5">
        <Card className="p-5 flex flex-col gap-4">
          <Field label="שם האירוע" required>
            <Input name="title" placeholder="לדוגמה: יום הולדת קבוצתי - כיתת פרחים" required />
          </Field>
          <Field label="תיאור האירוע">
            <Textarea name="description" placeholder="פרטים נוספים שיוצגו להורים..." />
          </Field>
          <Field label="תאריך האירוע">
            <Input type="date" name="event_date" dir="ltr" />
          </Field>
        </Card>

        <Card className="p-5 flex flex-col gap-4">
          <Field label="טקסט הצהרת ההסכמה" required>
            <Textarea
              name="consent_text"
              defaultValue={DEFAULT_CONSENT_TEXT}
              className="min-h-[110px]"
            />
          </Field>
          <CheckboxRow
            id="requires_health_declaration"
            checked={requiresHealth}
            onChange={setRequiresHealth}
          >
            דרוש אישור הצהרה בריאותית נפרדת בטופס (מומלץ לאירועי פעילות גופנית/אוכל)
          </CheckboxRow>
          {/* mirror the controlled checkbox into a plain field the server action can read reliably */}
          <input type="hidden" name="requires_health_declaration" value={requiresHealth ? "on" : "off"} />
        </Card>

        {error && (
          <div className="rounded-xl border border-clay bg-clay/10 px-4 py-3 text-sm text-clay">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "יוצר אירוע..." : "יצירת האירוע"}
        </Button>
      </form>
    </div>
  );
}
