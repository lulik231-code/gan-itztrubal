"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { Child } from "@/types";

interface ChildPickerProps {
  childRoster: Child[];
  selectedChild: Child | null;
  onSelect: (child: Child | null) => void;
}

export function ChildPicker({ childRoster, selectedChild, onSelect }: ChildPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return childRoster;
    return childRoster.filter((c) => c.full_name.includes(q));
  }, [childRoster, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedChild) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-pine bg-sage-light px-4 py-3.5">
        <div>
          <p className="font-medium text-pine-dark">{selectedChild.full_name}</p>
          {selectedChild.class_name && (
            <p className="text-sm text-pine-dark/60">{selectedChild.class_name}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          className="text-pine hover:text-amber-dark p-1.5 rounded-lg transition-colors"
          aria-label="הסר בחירה"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-sage" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="חפשו את שם הילד/ה..."
          className="w-full rounded-lg border border-line bg-card pr-11 pl-4 py-2.5 text-pine-dark placeholder:text-pine-dark/40 focus:border-amber focus:outline-none"
        />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-line bg-card shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-pine-dark/50">לא נמצאו ילדים בשם זה</p>
          ) : (
            filtered.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => {
                  onSelect(child);
                  setIsOpen(false);
                }}
                className="w-full text-right px-4 py-3 hover:bg-sage-light transition-colors border-b border-line last:border-0"
              >
                <p className="font-medium text-pine-dark">{child.full_name}</p>
                {child.class_name && (
                  <p className="text-sm text-pine-dark/60">{child.class_name}</p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
