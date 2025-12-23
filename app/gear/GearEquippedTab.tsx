// app/gear/GearEquippedTab.tsx
"use client";

import { Card } from "@/components/ui/card";
import { useGear } from "../hooks/useGear";
import { GEAR_SLOTS } from "../constants";

export default function GearEquippedTab() {
  const { customGears, equipped, setEquipped } = useGear();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {GEAR_SLOTS.map(({ key, label }) => {
        const available = customGears.filter(g => g.slot === key);

        return (
          <Card key={key} className="p-3 space-y-2 border-[#2b2a33]">
            <p className="text-xs text-muted-foreground">{label}</p>

            {/* Slot image placeholder */}
            <div className="h-14 rounded bg-muted/40 flex items-center justify-center text-xs">
              {label}
            </div>

            <select
              value={equipped[key] || ""}
              onChange={(e) =>
                setEquipped(prev => ({
                  ...prev,
                  [key]: e.target.value || undefined,
                }))
              }
              className="w-full rounded border bg-background px-2 py-1 text-sm"
            >
              <option value="">Empty</option>
              {available.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Card>
        );
      })}
    </div>
  );
}
