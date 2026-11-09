import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Field";
import { InspectorSign } from "./InspectorSign";
import { anonClient, loadInspectorView } from "@/lib/inspectorLink";
import { formatReleaseDate } from "@/lib/earlyRelease";
import { releaseTypeLabel, scheduleSentence, STANDING_TITLE } from "@/lib/standingRelease";

export const dynamic = "force-dynamic";

// The link is private: keep it out of search engines and do not leak it through the referrer.
export const metadata: Metadata = {
  title: "אישור שחרור קבוע - גן אצטרובל",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InspectorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await loadInspectorView(token);

  if (!view) {
    return (
      <div className="flex-1 flex flex-col">
        <SiteHeader />
        <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-display text-pine mb-2">הקישור אינו תקף</h2>
            <p className="text-sm text-pine-dark/70 leading-relaxed">
              ייתכן שפג תוקפו או שהטופס כבר נחתם. לקבלת קישור חדש יש לפנות לצוות הגן.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  // Short-lived links to open the documents (the storage bucket itself is private).
  const storage = anonClient().storage.from("consent-pdfs");
  const sign = async (path: string) => (await storage.createSignedUrl(path, 60 * 60)).data?.signedUrl ?? null;
  const formUrl = await sign(view.pdf_storage_path);
  const docs = await Promise.all(
    view.attachments.map(async (a, i) => ({ name: a.name, n: i + 1, url: await sign(a.path) }))
  );

  const parents = [view.parent1_name, view.parent2_name].filter(Boolean).join(" ו");

  return (
    <div className="flex-1 flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-display text-pine">{STANDING_TITLE}</h2>
          <p className="text-sm text-pine-dark/60 mt-1">אישור המפקח/ת. הטופס נחתם על ידי ההורים.</p>
        </div>

        <Card className="p-5 flex flex-col gap-2 text-sm text-pine-dark">
          <p><span className="font-medium">ילד/ה:</span> {view.child_name}{view.class_name ? ` (${view.class_name})` : ""}</p>
          <p><span className="font-medium">גן:</span> {view.kindergarten_name}</p>
          <p><span className="font-medium">סוג השחרור:</span> {releaseTypeLabel(view.release_type)}{view.reason_text ? `. סיבה: ${view.reason_text}` : ""}</p>
          <p><span className="font-medium">ימים ושעות:</span> {scheduleSentence(view.schedule)}</p>
          <p><span className="font-medium">החל מתאריך:</span> {formatReleaseDate(view.start_date)}</p>
          {view.notes && <p><span className="font-medium">הערות:</span> {view.notes}</p>}
          <p><span className="font-medium">ההורים הפונים:</span> {parents}</p>
        </Card>

        <Card className="p-5 flex flex-col gap-3">
          <h3 className="font-medium text-pine">מסמכים</h3>
          {formUrl && (
            <a href={formUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-pine hover:text-amber-dark underline">
              פתיחת הטופס (PDF)
            </a>
          )}
          {docs.length === 0 && <p className="text-sm text-pine-dark/60">לא צורפו מסמכים נוספים.</p>}
          {docs.map((d) =>
            d.url ? (
              <a key={d.n} href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-pine hover:text-amber-dark underline">
                מסמך מצורף {d.n}
              </a>
            ) : null
          )}
        </Card>

        <InspectorSign token={token} />
      </main>
    </div>
  );
}
