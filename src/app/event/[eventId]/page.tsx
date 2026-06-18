import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { EventFlow } from "@/components/EventFlow";
import { Card } from "@/components/ui/Field";
import { PineconeMark } from "@/components/PineconeMark";
import type { Event, Child } from "@/types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("is_active", true)
    .single<Event>();

  if (!event) {
    notFound();
  }

  const { data: children } = await supabase
    .from("children")
    .select("*")
    .eq("is_active", true)
    .order("full_name", { ascending: true })
    .returns<Child[]>();

  return (
    <div className="flex-1 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-pine hover:text-amber-dark transition-colors mb-5"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לרשימת האירועים
        </Link>

        {!children || children.length === 0 ? (
          <Card className="p-8 text-center">
            <PineconeMark className="h-10 w-10 mx-auto text-sage mb-3" />
            <p className="text-pine-dark/70">רשימת הילדים עדיין לא הוזנה למערכת. פנו לצוות הגן.</p>
          </Card>
        ) : (
          <EventFlow event={event} childRoster={children} />
        )}
      </main>
    </div>
  );
}
