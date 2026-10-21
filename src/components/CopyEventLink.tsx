"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export function CopyEventLink({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/event/${eventId}`
      : `/event/${eventId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        dir="ltr"
        className="text-xs text-pine-dark/50 bg-sage-light/60 rounded-lg px-3 py-1.5 font-mono truncate max-w-[280px]"
      >
        {`/event/${eventId}`}
      </span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm text-pine hover:text-amber-dark transition-colors"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-pine" />
            <span className="text-pine">הועתק!</span>
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            העתק קישור להורים
          </>
        )}
      </button>
    </div>
  );
}
