import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Field";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Event, SubmissionWithRelations } from "@/types";
import { SubmissionsTable } from "./SubmissionsTable";
import { EventEditForm } from "./EventEditForm";
import { CopyEventLink } from "@/components/CopyEventLink";
import { EventBulkDownload } from "./EventBulkDownload";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireAdmin();
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single<Event>();

  if (!event) {
    notFound();
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, events(id, title, event_date), children(id, full_name, class_name)")
    .eq("event_id", eventId)
    .order("submitted_at", { ascending: false })
    .returns<SubmissionWithRelations[]>();

  const { data: accessRows } = await supabase
    .from("event_edit_access")
    .select("child_id")
    .eq("event_id", eventId);
  const openChildIds = (accessRows ?? []).map((r) => r.child_id as string);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-pine hover:text-amber-dark transition-colors"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה לרשימת האירועים
      </Link>

      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-pine-dark/70">קישור לטופס ההורים:</span>
          <CopyEventLink eventId={event.id} />
        </div>
      </Card>

      <EventEditForm event={event} />

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="font-medium text-pine">הגשות ({submissions?.length ?? 0})</h3>
          {(submissions?.length ?? 0) > 0 && <EventBulkDownload eventId={event.id} />}
        </div>
        <SubmissionsTable
          submissions={submissions ?? []}
          eventDate={event.event_date}
          openChildIds={openChildIds}
        />
      </Card>
    </div>
  );
}
