import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PineconeMark } from "@/components/PineconeMark";
import Link from "next/link";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;

  return (
    <div className="flex-1 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10 flex items-center justify-center">
        <Card className="p-8 text-center w-full">
          <PineconeMark className="h-14 w-14 mx-auto text-pine mb-4" />
          <h2 className="text-2xl font-display text-pine mb-2">הטופס נשלח בהצלחה!</h2>
          <p className="text-pine-dark/80 leading-relaxed">
            {child ? `ההסכמה עבור ${child} נקלטה ` : "ההסכמה נקלטה "}
            במערכת. תודה שמיליתם את הטופס.
          </p>
          <p className="text-sm text-pine-dark/60 mt-3">
            המסמך החתום נשמר במערכת הגן ואין צורך לשלוח אותו בנפרד.
          </p>
          <Link href="/" className="inline-block mt-6">
            <Button variant="secondary">חזרה לעמוד הראשי</Button>
          </Link>
        </Card>
      </main>
    </div>
  );
}
