import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Plus, CalendarDays, Users, FileCheck2 } from "lucide-react";
import type { Event } from "@/types";

export const dynamic = "force-dynamic";

function formatDateHebrew(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false })
    .returns<Event[]>();

  // Submission counts per event, fetched in one query and grouped client-side
  const { data: submissionCounts } = await supabase
    .from("submissions")
    .select("event_id");

  const countByEvent = new Map<string, number>();
  submissionCounts?.forEach((s) => {
    countByEvent.set(s.event_id, (countByEvent.get(s.event_id) ?? 0) + 1);
  });

  const { count: childrenCount } = await supabase
    .from("children")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display text-pine">ניהול אירועים</h2>
          <p className="text-sm text-pine-dark/60 mt-1">
            {childrenCount ?? 0} ילדים פעילים ברשימה
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            אירוע חדש
          </Button>
        </Link>
      </div>

      {(!events || events.length === 0) && (
        <Card className="p-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-sage mb-3" />
          <p className="text-pine-dark/70 mb-4">לא נוצרו אירועים עדיין.</p>
          <Link href="/admin/events/new">
            <Button>צירת האירוע הראשון</Button>
          </Link>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {events?.map((event) => {
          const submissionCount = countByEvent.get(event.id) ?? 0;
          return (
            <Link key={event.id} href={`/admin/events/${event.id}`}>
              <Card className="p-5 hover:border-amber transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-pine-dark">{event.title}</h3>
                      {!event.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sage-light text-pine-dark/60">
                          לא פעיל
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-pine-dark/60">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDateHebrew(event.event_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 className="h-3.5 w-3.5" />
                        {submissionCount} הגשות
                      </span>
                      {childrenCount ? (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {Math.round((submissionCount / childrenCount) * 100)}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
