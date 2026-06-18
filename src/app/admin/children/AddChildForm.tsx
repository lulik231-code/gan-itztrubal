"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { addChildAction } from "./actions";
import { Plus, Loader2 } from "lucide-react";

export function AddChildForm() {
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await addChildAction(fullName, className);
    if (result.error) {
      setError(result.error);
    } else {
      setFullName("");
      setClassName("");
      nameInputRef.current?.focus();
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
      <div className="flex-1 min-w-[160px]">
        <Input
          ref={nameInputRef}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="שם הילד/ה"
          required
        />
      </div>
      <div className="flex-1 min-w-[140px]">
        <Input
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder="כיתה (רשות)"
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5 shrink-0">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        הוספה
      </Button>
      {error && <p className="text-sm text-clay w-full">{error}</p>}
    </form>
  );
}
