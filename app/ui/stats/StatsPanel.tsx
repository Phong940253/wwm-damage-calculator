// app/ui/StatsPanel.tsx
"use client";
import React, { useMemo, useRef, useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { STAT_GROUPS } from "../../constants";
import { LIST_MARTIAL_ARTS } from "../../domain/skill/types";
import { InputStats, ElementStats } from "../../types";
import StatCard from "./StatCard";

/* =======================
   Types
======================= */

type StatKey = Extract<keyof InputStats, string>;
type ElementStatKey = Exclude<keyof ElementStats, "selected" | "martialArtsId">;

interface Props {
  stats: InputStats;
  elementStats: ElementStats;
  gearBonus: Record<string, number>;
  statImpact?: Partial<Record<string, number>>; // ✅ optional
  onStatChange: (
    key: keyof InputStats,
    field: "current" | "increase",
    value: string
  ) => void;
  onElementChange: (
    key: keyof ElementStats | "selected",
    field: "current" | "increase" | "selected",
    value: string
  ) => void;
  onApplyIncrease: () => void;
  onSaveCurrent: () => void;
}

const getDerivedFromAttributes = (
  stats: InputStats,
  gearBonus: Record<string, number>
) => {
  const v = (k: keyof InputStats) =>
    Number(stats[k]?.current || 0) + (gearBonus[k] || 0);

  const agility = v("Agility");
  const momentum = v("Momentum");
  const power = v("Power");

  return {
    MinPhysicalAttack: agility * 1 + power * 0.246,
    MaxPhysicalAttack: momentum * 0.9 + power * 1.315,
    CriticalRate: agility * 0.075,
    AffinityRate: momentum * 0.04,
  };
};

/* =======================
   Component
======================= */

export default function StatsPanel({
  stats,
  elementStats,
  gearBonus,
  statImpact = {},
  onStatChange,
  onElementChange,
  onApplyIncrease,
  onSaveCurrent
}: Props) {
  // Track local input values for instant UI feedback
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  
  // Debounce timers
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const getStatValue = (key: string, field: "current" | "increase") => {
    return isElementKey(key)
      ? elementStats[key]?.[field]
      : stats[key as StatKey]?.[field];
  };

  const isElementKey = (key: string): key is ElementStatKey =>
    key in elementStats && key !== "selected" && key !== "martialArtsId";

  // Memoize derived stats to prevent recalculation on every keystroke
  const derived = useMemo(
    () => getDerivedFromAttributes(stats, gearBonus),
    [stats, gearBonus]
  );

  const handleStatChange = (
    key: string,
    field: "current" | "increase",
    value: string
  ) => {
    if (isElementKey(key)) {
      onElementChange(key, field, value);
    } else {
      onStatChange(key as StatKey, field, value);
    }
  };

  // Helper to apply change for total input (Base = Total - Gear - Derived)
  const applyTotalChange = useCallback(
    (key: string, value: string) => {
      if (value === "") {
        handleStatChange(key, "current", "");
      } else {
        const gear = gearBonus[key] || 0;
        const derivedValue = derived[key as keyof typeof derived] || 0;
        const nextBase =
          Math.round((Number(value) - gear - derivedValue) * 100000) / 100000;
        handleStatChange(key, "current", String(nextBase));
      }
    },
    [gearBonus, derived, handleStatChange]
  );

  // Helper for blur logic
  const handleInputBlur = useCallback(
    (key: string, field: "current" | "increase", isTotal: boolean) => {
      const inputKey = `${key}-${field}`;
      
      // Clear pending debounce timer
      if (debounceTimers.current[inputKey]) {
        clearTimeout(debounceTimers.current[inputKey]);
      }

      const currentValue = localValues[inputKey];
      if (currentValue !== undefined) {
        // Apply pending change immediately
        if (isTotal) {
          applyTotalChange(key, currentValue);
        } else {
          handleStatChange(key, field, currentValue);
        }
        
        // Clean up local value
        setLocalValues((prev) => {
          const next = { ...prev };
          delete next[inputKey];
          return next;
        });
      } else if (getStatValue(key, field) === "") {
        // Default to 0 if empty
        handleStatChange(key, field, "0");
      }
    },
    [localValues, applyTotalChange, handleStatChange, getStatValue]
  );

  // Debounced handler for input changes
  const createDebouncedHandler = useCallback(
    (key: string, field: "current" | "increase", isTotal: boolean) => {
      return (value: string) => {
        const inputKey = `${key}-${field}`;
        
        // Clear previous timer
        if (debounceTimers.current[inputKey]) {
          clearTimeout(debounceTimers.current[inputKey]);
        }

        // Store local value for instant UI feedback
        setLocalValues((prev) => ({ ...prev, [inputKey]: value }));

        // Set new debounced timer (300ms)
        debounceTimers.current[inputKey] = setTimeout(() => {
          if (isTotal) {
            applyTotalChange(key, value);
          } else {
            handleStatChange(key, field, value);
          }
          
          // Clean up local value after update
          setLocalValues((prev) => {
            const next = { ...prev };
            delete next[inputKey];
            return next;
          });
        }, 300);
      };
    },
    [applyTotalChange, handleStatChange]
  );

  return (
    <Card
      className="
        bg-card/70 backdrop-blur-xl
        border border-white/10
        shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]
        ring-1 ring-white/5
      "
    >
      <CardContent className="pt-6 space-y-10">
        {/* Element Selection */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Elements</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Martial Art
            </label>
            <select
              className="w-full border rounded px-2 py-2 bg-background"
              value={elementStats.martialArtsId}
              onChange={(e) => {
                const nextId = e.target.value;
                const art = LIST_MARTIAL_ARTS.find((m) => m.id === nextId);
                console.log("Selected martial art:", art);

                onElementChange("martialArtsId", "selected", nextId);

                // Keep main element in sync with chosen martial art
                if (art) {
                  onElementChange("selected", "selected", art.element);
                }
              }}
            >
              {LIST_MARTIAL_ARTS.map((art) => (
                <option key={art.id} value={art.id}>
                  {art.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {Object.entries(STAT_GROUPS).map(([group, keys]) => (
          <section key={group} className="space-y-5">
            {/* ---------- Group Header ---------- */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{group}</h2>
              <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* ---------- Stats Grid ---------- */}
            <div className="grid md:grid-cols-2 gap-4">
              {(keys as (StatKey | ElementStatKey)[]).map((k) => {
                const stat = isElementKey(k)
                  ? elementStats[k]
                  : stats[k as StatKey];
                if (!stat) return null;

                const impact = statImpact[k] ?? 0;
                const gear = gearBonus[k] || 0;
                const derivedValue = derived[k as keyof typeof derived] || 0;
                const base = Number(stat.current || 0);
                const total = Math.round((base + gear + derivedValue) * 100000) / 100000;

                return (
                  <StatCard
                    key={k}
                    statKey={k}
                    elementStats={elementStats}
                    impact={impact}
                    gear={gear}
                    derivedValue={derivedValue}
                    base={base}
                    total={total}
                    localValue={localValues[`${k}-current`]}
                    localIncreaseValue={localValues[`${k}-increase`]}
                    onTotalChange={(value) => {
                      createDebouncedHandler(k, "current", true)(value);
                    }}
                    onTotalBlur={() => handleInputBlur(k, "current", true)}
                    onIncreaseChange={(value) => {
                      createDebouncedHandler(k, "increase", false)(value);
                    }}
                    onIncreaseBlur={() => handleInputBlur(k, "increase", false)}
                  />
                );
              })}
            </div>
          </section>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onApplyIncrease}
            className="
              rounded-xl px-3 py-2 text-sm font-medium
              bg-emerald-500/15 text-emerald-400
              border border-emerald-500/30
              hover:bg-emerald-500/25
            "
          >
            Apply Increase → Current
          </button>

          <button
            onClick={onSaveCurrent}
            className="
              rounded-xl px-3 py-2 text-sm font-medium
              bg-amber-500/15 text-amber-400
              border border-amber-500/30
              hover:bg-amber-500/25
            "
          >
            Save Current
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
