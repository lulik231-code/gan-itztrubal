import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CopyLink } from "@/components/CopyEventLink";
import { ReleaseRequestsTable } from "./ReleaseRequestsTable";
import { RELEASE_REQUEST_TITLE } from "@/lib/releaseRequest";
import { todayInIsrael, formatReleaseDate } from "@/lib/earlyRelease";
import type { ReleaseRequest } from "@/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminReleaseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date: dateParam } = await searchParams;
  const today = todayInIsrael();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;

  const supabase = await createClient();
  let query = supabase
    .from("release_requests")
    .select("*, children(id, full_name, class_name)")
    .order("request_date", { ascending: false })
    .order("from_time", { ascending: true });
  // By default show today and everything upcoming; a chosen date shows just that day.
  query = date ? query.eq("request_date", date) : query.gte("request_date", today);
  const { data: requests } = await query.returns<ReleaseRequest[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-display text-pine">{RELEASE_REQUEST_TITLE}</h2>
        <p className="text-sm text-pine-dark/60 mt-1">
          טופס בנוסח משרד החינוך. כל הגשה נשמרת כ-PDF שאפשר להוריד ולשלוח למפקחת.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-pine-dark/70">קישור לטופס ההורים:</span>
          <CopyLink path="/release-request" />
        </div>
      </Card>

      <Card className="p-5">
        <form method="get" className="flex items-end gap-3 flex-wrap mb-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-sm font-medium text-pine-dark">תאריך</label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={date ?? ""}
              dir="ltr"
              className="rounded-lg border border-line bg-card px-3 py-2 text-pine-dark focus:border-amber focus:outline-none"
            />
          </div>
          <Button type="submit" variant="secondary">הצגה</Button>
          {date && (
            <Link href="/admin/release-requests" className="text-sm text-pine hover:text-amber-dark py-2.5">
              חזרה להיום ואילך
            </Link>
          )}
        </form>
        <h3 className="font-medium text-pine mb-4">
          {date ? formatReleaseDate(date) : "היום ובהמשך"} ({requests?.length ?? 0})
        </h3>
        <ReleaseRequestsTable requests={requests ?? []} />
      </Card>
    </div>
  );
}
