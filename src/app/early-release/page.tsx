import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { EarlyReleaseForm } from "@/components/EarlyReleaseForm";
import { Card } from "@/components/ui/Field";
import { PineconeMark } from "@/components/PineconeMark";
import type { Child } from "@/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "שחרור מוקדם מהגן - גן אצטרובל" };

export default async function EarlyReleasePage() {
  const supabase = await createClient();
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
        {!children || children.length === 0 ? (
          <Card className="p-8 text-center">
            <PineconeMark className="h-10 w-10 mx-auto text-sage mb-3" />
            <p className="text-pine-dark/70">רשימת הילדים עדיין לא הוזנה למערכת. פנו לצוות הגן.</p>
          </Card>
        ) : (
          <EarlyReleaseForm childRoster={children} />
        )}
      </main>
    </div>
  );
}
