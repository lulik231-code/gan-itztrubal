import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Field";
import { ChildrenImportPanel } from "./ChildrenImportPanel";
import { AddChildForm } from "./AddChildForm";
import { ChildrenList } from "./ChildrenList";
import type { Child } from "@/types";

export const dynamic = "force-dynamic";

export default async function ChildrenPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: children } = await supabase
    .from("children")
    .select("*")
    .order("full_name", { ascending: true })
    .returns<Child[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-display text-pine">רשימת ילדים</h2>
        <p className="text-sm text-pine-dark/60 mt-1">
          {children?.filter((c) => c.is_active).length ?? 0} ילדים פעילים מתוך {children?.length ?? 0}
        </p>
      </div>

      <Card className="p-5 flex flex-col gap-5">
        <ChildrenImportPanel />
        <div className="border-t border-line pt-4">
          <p className="text-sm font-medium text-pine-dark mb-2">הוספת ילד/ה בודד/ת</p>
          <AddChildForm />
        </div>
      </Card>

      <Card className="p-5">
        <ChildrenList childRoster={children ?? []} />
      </Card>
    </div>
  );
}
