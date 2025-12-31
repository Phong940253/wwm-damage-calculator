"use client";

import { FinalStatSection } from "@/app/domain/damage/type";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function FinalStatPanel({
  sections,
}: {
  sections: FinalStatSection[];
}) {
  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <Section key={section.title} section={section} />
      ))}
    </div>
  );
}

function Section({ section }: { section: FinalStatSection }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl bg-black/30 border border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="
          w-full flex items-center justify-between
          px-4 py-2 text-sm font-medium
          text-zinc-200
          hover:bg-white/5
        "
      >
        {section.title}
        <ChevronDown
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-2 space-y-1">
          {section.rows.map((row, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span
                className={
                  row.highlight
                    ? "text-yellow-400 font-semibold"
                    : "text-zinc-100"
                }
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
