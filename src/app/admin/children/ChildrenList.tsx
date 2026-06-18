"use client";

import { useState } from "react";
import { toggleChildActiveAction, deleteChildAction } from "./actions";
import { Trash2 } from "lucide-react";
import type { Child } from "@/types";

export function ChildrenList({ childRoster }: { childRoster: Child[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleToggle(child: Child) {
    setPendingId(child.id);
    await toggleChildActiveAction(child.id, !child.is_active);
    setPendingId(null);
  }

  async function handleDelete(child: Child) {
    if (!confirm(`למחוק את ${child.full_name} מהרשימה? לא ניתן לשחזר.`)) return;
    setPendingId(child.id);
    await deleteChildAction(child.id);
    setPendingId(null);
  }

  if (childRoster.length === 0) {
    return <p className="text-sm text-pine-dark/60 py-6 text-center">הרשימה ריקה.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-line">
      {childRoster.map((child) => (
        <div key={child.id} className="flex items-center justify-between py-3 gap-3">
          <div className="min-w-0">
            <p className={`font-medium ${child.is_active ? "text-pine-dark" : "text-pine-dark/40 line-through"}`}>
              {child.full_name}
            </p>
            {child.class_name && (
              <p className="text-sm text-pine-dark/50">{child.class_name}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-1.5 text-sm text-pine-dark/70 cursor-pointer">
              <input
                type="checkbox"
                checked={child.is_active}
                disabled={pendingId === child.id}
                onChange={() => handleToggle(child)}
                className="accent-pine h-4 w-4"
              />
              פעיל/ה
            </label>
            <button
              onClick={() => handleDelete(child)}
              disabled={pendingId === child.id}
              className="text-clay hover:text-clay/70 transition-colors disabled:opacity-50"
              aria-label="מחיקה"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
