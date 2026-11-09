"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SignaturePad, SignaturePadHandle } from "@/components/SignaturePad";

export function InspectorSign({ token }: { token: string }) {
  const pad = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [sigError, setSigError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const okName = name.trim().length > 0;
    const sig = pad.current?.isEmpty() ? null : pad.current?.getSignatureDataUrl() ?? null;
    setNameError(okName ? null : "יש להזין שם");
    setSigError(sig ? null : "יש לחתום");
    if (!okName || !sig) return;

    setBusy(true);
    try {
      const res = await fetch("/api/inspector-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), signature: sig }),
      });
      let data: { error?: string } = {};
      try { data = await res.json(); } catch { /* not JSON */ }
      if (!res.ok) {
        setSubmitError(data.error ?? "אירעה שגיאה. נסו שוב.");
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setSubmitError("שגיאת תקשורת. בדקו את החיבור ונסו שוב.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto text-pine mb-3" />
        <h3 className="text-xl font-display text-pine mb-1">האישור נשלח</h3>
        <p className="text-sm text-pine-dark/70">חתימתך נוספה לטופס. אפשר לסגור את הדף.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Card className="p-5 flex flex-col gap-4">
        <h3 className="font-medium text-pine">אישור המפקח/ת</h3>
        <Field label="שם המפקח/ת" required error={nameError ?? undefined}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <div>
          <p className="text-sm text-pine-dark/60 mb-2">חתימה (באצבע או בעכבר)</p>
          <SignaturePad ref={pad} error={!!sigError} />
          {sigError && <p className="text-sm text-clay mt-2">{sigError}</p>}
        </div>
      </Card>
      {submitError && (
        <div className="rounded-xl border border-clay bg-clay/10 px-4 py-3 text-sm text-clay">{submitError}</div>
      )}
      <Button type="submit" size="lg" disabled={busy} className="flex items-center justify-center gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "חותם..." : "אישור וחתימה"}
      </Button>
    </form>
  );
}
