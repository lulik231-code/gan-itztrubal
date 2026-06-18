"use client";

import { useState } from "react";
import { Card, Field } from "@/components/ui/Field";
import { ChildPicker } from "@/components/ChildPicker";
import { ConsentForm } from "@/components/ConsentForm";
import type { Event, Child } from "@/types";
import { CalendarDays } from "lucide-react";

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

      <Card className="p-5">
        <Field label="בחירת ילד/ה" required>
          <ChildPicker childRoster={childRoster} selectedChild={selectedChild} onSelect={setSelectedChild} />
        </Field>
      </Card>

      {selectedChild && <ConsentForm event={event} child={selectedChild} />}
    </div>
  );
}
