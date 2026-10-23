"use client";

import { useState, useEffect } from "react";
import { Card, Field } from "@/components/ui/Field";
import { ChildPicker } from "@/components/ChildPicker";
import { ConsentForm, type ConsentFormInitialValues } from "@/components/ConsentForm";
import { EditExistingSubmission } from "@/components/EditExistingSubmission";
import type { Event, Child } from "@/types";
import { CalendarDays, Loader2, Lock } from "lucide-react";

interface EventFlowProps {
  event: Event;
  childRoster: Child[];
}

function formatDateHebrew(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

export function EventFlow({ event, childRoster }: EventFlowProps) {
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "new" | "editable" | "locked" | "error">("idle");
  const [editing, setEditing] = useState<{ initial: ConsentFormInitialValues; verifyPhone: string } | null>(null);

  // When a child is picked, find out whether a form already exists for them
  // and whether it can still be edited (until the day of the event).
  useEffect(() => {
    setEditing(null);
    if (!selectedChild) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch("/api/submission-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, childId: selectedChild.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.exists === undefined) setStatus("error");
        else if (!d.exists) setStatus("new");
        else setStatus(d.editable ? "editable" : "locked");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [selectedChild, event.id]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="text-xl font-display text-pine">{event.title}</h2>
        {event.event_date && (
          <div className="flex items-center gap-1.5 text-sm text-pine-dark/70 mt-2">
            <CalendarDays className="h-4 w-4" />
            <span>{formatDateHebrew(event.event_date)}</span>
          </div>
        )}
        {event.description && (
          <p className="text-sm text-pine-dark/80 mt-3 leading-relaxed">{event.description}</p>
        )}
      </Card>

      {event.what_to_bring?.trim() && (
        <Card className="p-5">
          <h3 className="font-medium text-pine mb-2">מה להביא</h3>
          <p className="text-sm text-pine-dark/80 leading-relaxed whitespace-pre-line">
            {event.what_to_bring}
          </p>
        </Card>
      )}

      <Card className="p-5">
        <Field label="בחירת ילד/ה" required>
          <ChildPicker childRoster={childRoster} selectedChild={selectedChild} onSelect={setSelectedChild} />
        </Field>
      </Card>

      {selectedChild && status === "loading" && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-pine" />
        </div>
      )}

      {selectedChild && (status === "new" || status === "error") && (
        <ConsentForm key={`new-${selectedChild.id}`} event={event} child={selectedChild} />
      )}

      {selectedChild && status === "editable" && !editing && (
        <EditExistingSubmission
          eventId={event.id}
          childId={selectedChild.id}
          childName={selectedChild.full_name}
          eventDate={event.event_date}
          onLoaded={(initial, verifyPhone) => setEditing({ initial, verifyPhone })}
        />
      )}

      {selectedChild && status === "editable" && editing && (
        <ConsentForm
          key={`edit-${selectedChild.id}`}
          event={event}
          child={selectedChild}
          editing={editing}
        />
      )}

      {selectedChild && status === "locked" && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-pine shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-pine mb-1">הטופס עבור {selectedChild.full_name} כבר הוגש</h3>
              <p className="text-sm text-pine-dark/70 leading-relaxed">
                אי אפשר לערוך את הטופס יותר, כי הגענו ליום האירוע. לשינוי דחוף פנו לצוות הגן.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
