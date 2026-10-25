import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PineconeMark } from "@/components/PineconeMark";
import Link from "next/link";

export default async function EarlyReleaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; time?: string; date?: string }>;
}) {
  const { child, time, date } = await searchParams;
  return (
    <div className="flex-1 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10 flex items-center justify-center">
        <Card className="p-8 text-center w-full">
          <PineconeMark className="h-14 w-14 mx-auto text-pine mb-4" />
          <h2 className="text-2xl font-display text-pine mb-2">אישור השחרור נשלח בהצלחה!</h2>
          <p className="text-pine-dark/80 leading-relaxed">
            {child ? `השחרור המוקדם של ${child}` : "השחרור המוקדם"}
            {date ? ` בתאריך ${date}` : ""}
            {time ? ` בשעה ${time}` : ""} נקלט במערכת.
          </p>
          <p className="text-sm text-pine-dark/60 mt-3">
            המסמך החתום נשמר במערכת הגן ואין צורך לשלוח אותו בנפרד.
          </p>
          <Link href="/early-release" className="inline-block mt-6">
            <Button variant="secondary">מילוי טופס נוסף</Button>
          </Link>
        </Card>
      </main>
    </div>
  );
}
