import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CopyLink } from "@/components/CopyEventLink";
import { EarlyReleaseTable } from "./EarlyReleaseTable";
import { TeachersManager } from "./TeachersManager";
import { MonthDownload } from "./MonthDownload";
import { todayInIsrael, formatReleaseDate } from "@/lib/earlyRelease";
import type { EarlyRelease, KindergartenTeacher } from "@/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminEarlyReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date: dateParam } = await searchParams;
  const today = todayInIsrael();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  const supabase = await createClient();
  const { data: releases } = await supabase
    .from("early_releases")
    .select("*, children(id, full_name, class_name)")
    .eq("release_date", date)
    .order("release_time", { ascending: true })
    .returns<EarlyRelease[]>();

  const { data: teachers } = await supabase
    .from("kindergarten_teachers")
    .select("id, full_name, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<KindergartenTeacher[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-display text-pine">שחרורים מוקדמים</h2>
        <p className="text-sm text-pine-dark/60 mt-1">
          הורים ממלאים טופס קבוע בקישור אחד, והתאריך נקבע אוטומטית ליום המילוי.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-pine-dark/70">קישור לטופס ההורים:</span>
          <CopyLink path="/early-release" />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-pine mb-1">הורדת חודש שלם</h3>
        <p className="text-sm text-pine-dark/60 mb-4">
          קובץ ZIP עם כל אישורי החודש כ-PDF, וגם רשימה מסודרת שנפתחת באקסל.
        </p>
        <MonthDownload defaultMonth={today.slice(0, 7)} />
      </Card>

      <Card className="p-5">
        <form method="get" className="flex items-end gap-3 flex-wrap mb-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-sm font-medium text-pine-dark">תאריך</label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={date}
              dir="ltr"
              className="rounded-lg border border-line bg-card px-3 py-2 text-pine-dark focus:border-amber focus:outline-none"
            />
          </div>
          <Button type="submit" variant="secondary">הצגה</Button>
          {date !== today && (
            <Link href="/admin/early-release" className="text-sm text-pine hover:text-amber-dark py-2.5">
              חזרה להיום
            </Link>
          )}
        </form>
        <h3 className="font-medium text-pine mb-4">
          {date === today ? "היום" : formatReleaseDate(date)} ({releases?.length ?? 0})
        </h3>
        <EarlyReleaseTable releases={releases ?? []} />
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-pine mb-1">גננות בטופס</h3>
        <p className="text-sm text-pine-dark/60 mb-4">
          השמות שההורים בוחרים מהם בטופס. אפשר לשנות שם (למשל כשהגננת המשלימה מוחלפת), להוסיף או להסיר. טפסים
          שכבר מולאו שומרים את השם שנבחר בזמנו.
        </p>
        <TeachersManager teachers={teachers ?? []} />
      </Card>
    </div>
  );
}
