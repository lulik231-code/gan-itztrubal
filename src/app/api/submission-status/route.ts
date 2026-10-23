import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Tells the parent page whether a form was already submitted for this child
// and whether it can still be edited (until the day of the event).
export async function POST(req: NextRequest) {
  const { eventId, childId } = await req.json().catch(() => ({}));
  if (!eventId || !childId) {
    return NextResponse.json({ error: "חסרים פרטים." }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.rpc("check_submission_status", {
    p_event: eventId,
    p_child: childId,
  });
  if (error) {
    console.error("check_submission_status error:", error);
    return NextResponse.json({ error: "שגיאה בבדיקת הטופס." }, { status: 500 });
  }
  return NextResponse.json(data);
}
