"use client";

import { Card } from "@/components/ui/card";
import { useGear } from "../../hooks/useGear";
import { GEAR_SLOTS } from "../../constants";
import GearDetailCard from "@/app/ui/gear/GearDetailCard";
import GearCombinedStats from "./GearCombinedStats";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";

export default function GearEquippedTab() {
  const { customGears, equipped, setEquipped } = useGear();
  const bonus = aggregateEquippedGearBonus(customGears, equipped);

  return (
    <div className="space-y-4" id="gear-combined-stats">
      {/* Combined result */}
      <GearCombinedStats bonus={bonus} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {GEAR_SLOTS.map(({ key, label }) => {
          const available = customGears.filter((g) => g.slot === key);
          const equippedGear = customGears.find((g) => g.id === equipped[key]);

          return (
            <Card key={key} className="p-3 space-y-3 border-[#2b2a33]">
              <p className="text-xs text-muted-foreground">{label}</p>

              <select
                value={equipped[key] || ""}
                onChange={(e) =>
                  setEquipped((prev) => ({
                    ...prev,
                    [key]: e.target.value || undefined,
                  }))
                }
                className="w-full rounded border bg-background px-2 py-1 text-sm"
              >
                <option value="">Empty</option>
                {available.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {/* ✅ Gear detail */}
              {equippedGear ? (
                <GearDetailCard gear={equippedGear} />
              ) : (
                <div className="h-36 rounded bg-muted/40 flex items-center justify-center text-xs">
                  {label}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
