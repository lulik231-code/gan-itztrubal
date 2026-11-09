import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Field";
import { CopyLink } from "@/components/CopyEventLink";
import { StandingReleasesList } from "./StandingReleasesList";
import type { StandingRelease } from "@/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminStandingReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status: statusParam } = await searchParams;
  const status = statusParam === "approved" ? "approved" : "pending";

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("standing_releases")
    .select("*, children(id, full_name, class_name)")
    .eq("status", status)
    .order("submitted_at", { ascending: false })
    .returns<StandingRelease[]>();

  const { count: pendingCount } = await supabase
    .from("standing_releases")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-pine text-card" : "text-pine hover:bg-sage-light"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-display text-pine">שחרור קבוע</h2>
        <p className="text-sm text-pine-dark/60 mt-1">
          ההורים ממלאים וחותמים, את מורידה קובץ אחד ושולחת למפקחת, ולאחר שהיא חותמת מעלים אותו בחזרה לכאן.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-pine-dark/70">קישור לטופס ההורים:</span>
          <CopyLink path="/standing-release" />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex gap-2 mb-4">
          {tab("/admin/standing-releases", `ממתינים לאישור (${pendingCount ?? 0})`, status === "pending")}
          {tab("/admin/standing-releases?status=approved", "מאושרים", status === "approved")}
        </div>
        <StandingReleasesList items={items ?? []} />
      </Card>
    </div>
  );
}
