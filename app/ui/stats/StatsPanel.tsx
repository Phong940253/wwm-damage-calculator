// app/ui/StatsPanel.tsx
"use client";
import React, { useMemo, useRef, useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { STAT_GROUPS } from "../../constants";
import { LIST_MARTIAL_ARTS } from "../../domain/skill/types";
import { InputStats, ElementStats } from "../../types";
import StatCard from "./StatCard";
import { SUPPORTED_LEVELS } from "@/app/domain/level/levelSettings";

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
  levelContext?: { playerLevel: number; enemyLevel: number };
  setPlayerLevel?: (level: number) => void;
  setEnemyLevel?: (level: number) => void;
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
  levelContext,
  setPlayerLevel,
  setEnemyLevel,
  onStatChange,
  onElementChange,
  onApplyIncrease,
  onSaveCurrent,
}: Props) {
  const safeLevelContext = levelContext ?? { playerLevel: 81, enemyLevel: 81 };
  const safeSetPlayerLevel = setPlayerLevel ?? (() => { });
  const safeSetEnemyLevel = setEnemyLevel ?? (() => { });
  // Track local input values for instant UI feedback
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // Debounce timers
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const isElementKey = useCallback(
    (key: string): key is ElementStatKey =>
      key in elementStats && key !== "selected" && key !== "martialArtsId",
    [elementStats]
  );

  // Memoize derived stats to prevent recalculation on every keystroke
  const derived = useMemo(
    () => getDerivedFromAttributes(stats, gearBonus),
    [stats, gearBonus]
  );

  const handleStatChange = useCallback(
    (
      key: string,
      field: "current" | "increase",
      value: string
    ) => {
      if (isElementKey(key)) {
        onElementChange(key, field, value);
      } else {
        onStatChange(key as StatKey, field, value);
      }
    },
    [onElementChange, onStatChange, isElementKey]
  );

  const getStatValue = useCallback(
    (key: string, field: "current" | "increase") => {
      return isElementKey(key)
        ? elementStats[key]?.[field]
        : stats[key as StatKey]?.[field];
    },
    [elementStats, stats, isElementKey]
  );

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
      <CardContent className="p-6 space-y-10">
        {/* Level Selection */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Levels</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Player level</label>
              <select
                className="w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
                value={safeLevelContext.playerLevel}
                onChange={(e) => safeSetPlayerLevel(Number(e.target.value))}
              >
                {SUPPORTED_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Enemy level</label>
              <select
                className="w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
                value={safeLevelContext.enemyLevel}
                onChange={(e) => safeSetEnemyLevel(Number(e.target.value))}
              >
                {SUPPORTED_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Element Selection */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Elements</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <label className="text-xs text-muted-foreground">Martial Art</label>
              <span className="text-[11px] text-muted-foreground">
                Auto-syncs main element
              </span>
            </div>
            <select
              className="w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
              value={elementStats.martialArtsId}
              onChange={(e) => {
                const nextId = e.target.value;
                const art = LIST_MARTIAL_ARTS.find((m) => m.id === nextId);

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
                const total =
                  Math.round((base + gear + derivedValue) * 100000) / 100000;

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
                    increase={stat.increase}
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

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Actions</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onApplyIncrease}
              className="rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 hover:text-emerald-200"
              variant="secondary"
              type="button"
            >
              Apply Increase → Current
            </Button>

            <Button
              onClick={onSaveCurrent}
              className="rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 hover:text-amber-200"
              variant="secondary"
              type="button"
            >
              Save Current
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
