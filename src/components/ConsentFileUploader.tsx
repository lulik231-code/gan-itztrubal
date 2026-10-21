"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, FileText } from "lucide-react";

interface Props {
  onTextExtracted: (text: string) => void;
}

export function ConsentFileUploader({ onTextExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/extract-consent-text", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error ?? "שגיאה בהעלאה");
        return;
      }

      if (!json.text) {
        setError("לא נמצא טקסט בקובץ");
        return;
      }

      onTextExtracted(json.text);
    } catch {
      setError("שגיאת רשת. נסי שוב.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-line hover:border-amber transition-colors rounded-xl p-4 flex items-center gap-3 cursor-pointer bg-sage-light/30 hover:bg-sage-light/60"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.pdf"
          className="hidden"
          onChange={handleChange}
        />
        {loading ? (
          <Loader2 className="h-5 w-5 text-pine animate-spin shrink-0" />
        ) : (
          <Upload className="h-5 w-5 text-pine-dark/50 shrink-0" />
        )}
        <div className="flex flex-col">
          <span className="text-sm text-pine-dark/70">
            {loading
              ? "מחלץ טקסט..."
              : fileName
              ? fileName
              : "גרור קובץ לכאן או לחצי לבחירה"}
          </span>
          <span className="text-xs text-pine-dark/40">Word (.docx) או PDF</span>
        </div>
        {fileName && !loading && (
          <FileText className="h-4 w-4 text-pine mr-auto shrink-0" />
        )}
      </div>

      {error && (
        <p className="text-xs text-clay">{error}</p>
      )}
    </div>
  );
}
