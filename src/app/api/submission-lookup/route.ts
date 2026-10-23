import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Returns the previously submitted answers so the parent can edit them, but
// only when the phone number matches the one on the original form.
export async function POST(req: NextRequest) {
  const { eventId, childId, phone } = await req.json().catch(() => ({}));
  if (!eventId || !childId || !phone) {
    return NextResponse.json({ error: "חסרים פרטים." }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.rpc("get_submission_for_edit", {
    p_event: eventId,
    p_child: childId,
    p_phone: String(phone),
  });
  if (error) {
    console.error("get_submission_for_edit error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הטופס." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "מספר הטלפון אינו תואם לטופס שהוגש, או שהעריכה נחסמה." },
      { status: 403 }
    );
  }
  return NextResponse.json({ submission: data });
}
