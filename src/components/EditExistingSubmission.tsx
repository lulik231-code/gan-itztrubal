"use client";

import { useState } from "react";
import { Card, Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import type { ConsentFormInitialValues } from "@/components/ConsentForm";

interface Props {
  eventId: string;
  childId: string;
  childName: string;
  eventDate: string | null;
  onLoaded: (initial: ConsentFormInitialValues, verifyPhone: string) => void;
}

function formatDateHebrew(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

/** Shown when a form was already submitted and can still be edited. */
export function EditExistingSubmission({ eventId, childId, childName, eventDate, onLoaded }: Props) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError("יש להזין את מספר הטלפון שמילאתם בטופס.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/submission-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, childId, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "אירעה שגיאה. נסו שוב.");
        return;
      }
      onLoaded(data.submission, phone);
    } catch {
      setError("שגיאת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="font-medium text-pine mb-1">כבר הוגש טופס עבור {childName}</h3>
      <p className="text-sm text-pine-dark/70 leading-relaxed mb-4">
        אפשר לערוך את הטופס
        {eventDate ? ` עד היום שלפני האירוע (${formatDateHebrew(eventDate)})` : ""}. כדי לאמת שזה הטופס שלכם,
        הזינו את מספר הטלפון שמילאתם בו.
      </p>
      <form onSubmit={handleLoad} className="flex flex-col gap-4">
        <Field label="מספר הטלפון שמולא בטופס" error={error ?? undefined}>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-1234567"
            dir="ltr"
          />
        </Field>
        <Button type="submit" disabled={loading} className="flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          עריכת הטופס
        </Button>
      </form>
    </Card>
  );
}
