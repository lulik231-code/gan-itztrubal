import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Field";
import { PineconeMark } from "@/components/PineconeMark";
import type { Event } from "@/types";
import Link from "next/link";
import { CalendarDays, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic"; // events list changes frequently; always fetch fresh

function formatDateHebrew(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .order("event_date", { ascending: true })
    .returns<Event[]>();

  return (
    <div className="flex-1 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8">
        <h2 className="text-xl font-display text-pine mb-1">אירועים פעילים</h2>
        <p className="text-sm text-pine-dark/70 mb-6">
          בחרו את האירוע שעבורו תרצו למלא טופס הסכמה
        </p>

        {(!events || events.length === 0) && (
          <Card className="p-8 text-center">
            <PineconeMark className="h-10 w-10 mx-auto text-sage mb-3" />
            <p className="text-pine-dark/70">
              אין כרגע אירועים פעילים שדורשים הסכמת הורים.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {events?.map((event) => (
            <Link key={event.id} href={`/event/${event.id}`}>
              <Card className="p-5 flex items-center gap-4 hover:border-amber transition-colors group">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-pine-dark">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-pine-dark/60 mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  {event.event_date && (
                    <div className="flex items-center gap-1.5 text-sm text-pine mt-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatDateHebrew(event.event_date)}</span>
                    </div>
                  )}
                </div>
                <ChevronLeft className="h-5 w-5 text-sage shrink-0 group-hover:text-amber transition-colors" />
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
