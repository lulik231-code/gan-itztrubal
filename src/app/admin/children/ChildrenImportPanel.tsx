"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { importChildrenAction, type ChildImportRow } from "./actions";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";

// Recognizes common Hebrew/English column header variants so the admin
// doesn't have to format the spreadsheet in one exact way.
const NAME_HEADERS = ["שם", "שם מלא", "שם הילד", "שם הילד/ה", "name", "full_name", "full name"];
const CLASS_HEADERS = ["כיתה", "קבוצה", "class", "class_name", "group"];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function parseRows(raw: Record<string, unknown>[]): ChildImportRow[] {
  if (raw.length === 0) return [];

  const sampleKeys = Object.keys(raw[0]);
  const nameKey = sampleKeys.find((k) => NAME_HEADERS.includes(normalizeHeader(k)));
  const classKey = sampleKeys.find((k) => CLASS_HEADERS.includes(normalizeHeader(k)));

  // Fallback: if no recognized header, assume first column is the name.
  const effectiveNameKey = nameKey ?? sampleKeys[0];

  return raw.map((row) => ({
    full_name: String(row[effectiveNameKey] ?? "").trim(),
    class_name: classKey ? String(row[classKey] ?? "").trim() : undefined,
  }));
}

export function ChildrenImportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

      const rows = parseRows(raw);
      if (rows.length === 0) {
        setError("הקובץ ריק או שלא ניתן לקרוא ממנו שורות.");
        setIsProcessing(false);
        return;
      }

      const importResult = await importChildrenAction(rows);
      if (importResult.error) {
        setError(importResult.error);
      } else {
        setResult({ inserted: importResult.inserted, skipped: importResult.skipped });
      }
    } catch (err) {
      console.error("File parse error:", err);
      setError("שגיאה בקריאת הקובץ. בדקו שזהו קובץ Excel או CSV תקין.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
        id="children-file-upload"
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="flex items-center gap-2 self-start"
      >
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {isProcessing ? "מעבד קובץ..." : "ייבוא רשימה מאקסל"}
      </Button>

      <p className="text-xs text-pine-dark/50">
        קובץ Excel או CSV עם עמודה לשם הילד/ה (ועמודה אופציונלית לכיתה). השורה הראשונה צריכה להיות כותרות.
      </p>

      {result && (
        <div className="flex items-center gap-2 text-sm text-pine bg-sage-light rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4" />
          נוספו {result.inserted} ילדים בהצלחה
          {result.skipped > 0 && ` (${result.skipped} שורות לא תקינות דולגו)`}
        </div>
      )}
      {error && (
        <div className="text-sm text-clay bg-clay/10 rounded-lg px-3 py-2">{error}</div>
      )}
    </div>
  );
}
