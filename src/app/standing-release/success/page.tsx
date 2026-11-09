import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Field";
import { PineconeMark } from "@/components/PineconeMark";

export default async function StandingReleaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; date?: string; time?: string }>;
}) {
  const { child, date, time } = await searchParams;
  return (
    <div className="flex-1 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10 flex items-center justify-center">
        <Card className="p-8 text-center w-full">
          <PineconeMark className="h-14 w-14 mx-auto text-pine mb-4" />
          <h2 className="text-2xl font-display text-pine mb-2">הטופס נשלח בהצלחה!</h2>
          <p className="text-pine-dark/80 leading-relaxed">
            {child ? `הבקשה לשחרור קבוע של ${child}` : "הבקשה לשחרור קבוע"}
            {time ? ` בשעה ${time}` : ""}
            {date ? `, החל מתאריך ${date},` : ""} נקלטה במערכת.
          </p>
          <p className="text-sm text-pine-dark/60 mt-3">
            הטופס יועבר לאישור המפקחת. צוות הגן יעדכן אתכם כשהאישור יתקבל.
          </p>
        </Card>
      </main>
    </div>
  );
}
