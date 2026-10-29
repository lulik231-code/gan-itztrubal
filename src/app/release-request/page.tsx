import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { ReleaseRequestForm } from "@/components/ReleaseRequestForm";
import { Card } from "@/components/ui/Field";
import { PineconeMark } from "@/components/PineconeMark";
import type { Child, KindergartenTeacher } from "@/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "שחרור ילד/ה לפני סיום יום הלימודים - גן אצטרובל" };

export default async function ReleaseRequestPage() {
  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("*")
    .eq("is_active", true)
    .order("full_name", { ascending: true })
    .returns<Child[]>();

  const { data: teachers } = await supabase
    .from("kindergarten_teachers")
    .select("id, full_name, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<KindergartenTeacher[]>();

  return (
    <div className="flex-1 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8">
        {!children || children.length === 0 ? (
          <Card className="p-8 text-center">
            <PineconeMark className="h-10 w-10 mx-auto text-sage mb-3" />
            <p className="text-pine-dark/70">רשימת הילדים עדיין לא הוזנה למערכת. פנו לצוות הגן.</p>
          </Card>
        ) : (
          <ReleaseRequestForm childRoster={children} teachers={(teachers ?? []).map((t) => t.full_name)} />
        )}
      </main>
    </div>
  );
}
