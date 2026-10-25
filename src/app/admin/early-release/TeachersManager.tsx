"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { addTeacherAction, renameTeacherAction, deleteTeacherAction } from "./actions";
import type { KindergartenTeacher } from "@/types";

function TeacherRow({ teacher }: { teacher: KindergartenTeacher }) {
  const router = useRouter();
  const [name, setName] = useState(teacher.full_name);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const changed = name.trim() !== teacher.full_name;

  async function save() {
    setBusy("save");
    const r = await renameTeacherAction(teacher.id, name);
    setBusy(null);
    if (!r.success) alert(r.error ?? "שגיאה בשמירה.");
    else router.refresh();
  }

  async function remove() {
    if (!confirm(`להסיר את ${teacher.full_name} מהרשימה?\nטפסים שכבר מולאו לא ישתנו.`)) return;
    setBusy("delete");
    const r = await deleteTeacherAction(teacher.id);
    setBusy(null);
    if (!r.success) alert(r.error ?? "שגיאה במחיקה.");
    else router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Button
        type="button"
        variant="secondary"
        onClick={save}
        disabled={!changed || !name.trim() || busy !== null}
        className="flex items-center gap-1.5 shrink-0"
      >
        {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        שמירה
      </Button>
      <button
        type="button"
        onClick={remove}
        disabled={busy !== null}
        title="הסרה"
        className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 p-2 shrink-0"
      >
        {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function TeachersManager({ teachers }: { teachers: KindergartenTeacher[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!newName.trim()) return;
    setAdding(true);
    const r = await addTeacherAction(newName);
    setAdding(false);
    if (!r.success) alert(r.error ?? "שגיאה בהוספה.");
    else {
      setNewName("");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {teachers.length === 0 && (
        <p className="text-sm text-pine-dark/60">
          אין גננות ברשימה, ולכן ההורים מקלידים את השם בעצמם. הוסיפי שמות כדי שיבחרו מתוך רשימה.
        </p>
      )}
      {teachers.map((t) => (
        <TeacherRow key={`${t.id}-${t.full_name}`} teacher={t} />
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="שם גננת חדשה"
        />
        <Button
          type="button"
          onClick={add}
          disabled={adding || !newName.trim()}
          className="flex items-center gap-1.5 shrink-0"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          הוספה
        </Button>
      </div>
    </div>
  );
}
