// app/ui/StatsPanel.tsx
"use client";
import React, { useMemo, useRef, useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STAT_GROUPS } from "../../constants";
import { LIST_MARTIAL_ARTS } from "../../domain/skill/types";
import { InputStats, ElementStats } from "../../types";
import StatCard from "./StatCard";
import { SUPPORTED_LEVELS } from "@/app/domain/level/levelSettings";
import type { Rotation } from "@/app/types";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { computeDerivedStats } from "@/app/domain/stats/derivedStats";
import { useI18n } from "@/app/providers/I18nProvider";
import { useStatHeatmap } from "@/app/hooks/useStatHeatmap";
import { getStatLabel } from "@/app/utils/statLabel";

/* =======================
   Types
======================= */

type StatKey = Extract<keyof InputStats, string>;
type ElementStatKey = Exclude<keyof ElementStats, "selected" | "martialArtsId">;

interface Props {
  stats: InputStats;
  elementStats: ElementStats;
  gearBonus: Record<string, number>;
  rotation?: Rotation;
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

/* =======================
   Component
======================= */

export default function StatsPanel({
  stats,
  elementStats,
  gearBonus,
  rotation,
  statImpact = {},
  levelContext,
  setPlayerLevel,
  setEnemyLevel,
  onStatChange,
  onElementChange,
  onApplyIncrease,
  onSaveCurrent,
}: Props) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      levels: "Cấp độ",
      playerLevel: "Cấp nhân vật",
      enemyLevel: "Cấp kẻ địch",
      elements: "Nguyên tố",
      martialArt: "Võ học",
      autoSync: "Tự đồng bộ nguyên tố chính",
      actions: "Hành động",
      applyIncrease: "Áp dụng tăng vào hiện tại",
      saveCurrent: "Lưu hiện tại",
      heatmap: "Ưu tiên stat (Heatmap)",
      lineCount: "Số dòng affix (n)",
      gainRange: "Mức tăng DMG",
      affixGain: "Affix cộng",
      noHeatmap: "Chưa đủ dữ liệu để tính heatmap",
      rankHint: "Ưu tiên farm từ trên xuống",
    }
    : {
      levels: "Levels",
      playerLevel: "Player level",
      enemyLevel: "Enemy level",
      elements: "Elements",
      martialArt: "Martial Art",
      autoSync: "Auto-syncs main element",
      actions: "Actions",
      applyIncrease: "Apply Increase → Current",
      saveCurrent: "Save Current",
      heatmap: "Stat Priority Heatmap",
      lineCount: "Affix line count (n)",
      gainRange: "DMG gain",
      affixGain: "Affix gain",
      noHeatmap: "Not enough data to compute heatmap",
      rankHint: "Farm priority from top to bottom",
    };

  const safeLevelContext = levelContext ?? { playerLevel: 81, enemyLevel: 81 };
  const safeSetPlayerLevel = setPlayerLevel ?? (() => { });
  const safeSetEnemyLevel = setEnemyLevel ?? (() => { });
  // Track local input values for instant UI feedback
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [heatmapLines, setHeatmapLines] = useState(1);

  // Debounce timers
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const isElementKey = useCallback(
    (key: string): key is ElementStatKey =>
      key in elementStats && key !== "selected" && key !== "martialArtsId",
    [elementStats]
  );

  // Memoize derived stats to prevent recalculation on every keystroke
  const derived = useMemo(() => {
    const d = computeDerivedStats(stats, gearBonus);
    return {
      MinPhysicalAttack: d.minAtk,
      MaxPhysicalAttack: d.maxAtk,
      CriticalRate: d.critRate,
      AffinityRate: d.affinityRate,
    };
  }, [stats, gearBonus]);

  const includedInStatsBonus = useMemo(
    () => computeIncludedInStatsGearBonus(stats, elementStats, rotation, gearBonus),
    [stats, elementStats, rotation, gearBonus]
  );

  const statHeatmap = useStatHeatmap(
    stats,
    elementStats,
    gearBonus,
    rotation,
    levelContext,
    heatmapLines,
  );

  const topHeatmapImpact = useMemo(() => {
    if (statHeatmap.length === 0) return 0;
    return Math.max(...statHeatmap.map((row) => Math.abs(row.bestImpactPct)));
  }, [statHeatmap]);

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
        const passiveValue = includedInStatsBonus[key] || 0;
        const nextBase =
          Math.round(
            (Number(value) - gear - derivedValue - passiveValue) * 100000
          ) / 100000;
        handleStatChange(key, "current", String(nextBase));
      }
    },
    [gearBonus, derived, includedInStatsBonus, handleStatChange]
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
      <CardContent className="space-y-6 p-3 sm:space-y-8 sm:p-4 lg:space-y-10 lg:p-6">
        {/* Level Selection */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{text.levels}</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="grid gap-3 md:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{text.playerLevel}</label>
              <select
                data-tour="player-level"
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
              <label className="text-xs text-muted-foreground">{text.enemyLevel}</label>
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
            <h2 className="text-lg font-semibold">{text.elements}</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <label className="text-xs text-muted-foreground">{text.martialArt}</label>
              <span className="text-[11px] text-muted-foreground">
                {text.autoSync}
              </span>
            </div>
            <select
              data-tour="martial-art"
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

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{text.heatmap}</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{text.lineCount}</label>
              <Input
                type="number"
                min={1}
                max={20}
                step={1}
                value={heatmapLines}
                onChange={(e) => {
                  const next = Math.floor(Number(e.target.value) || 1);
                  setHeatmapLines(Math.max(1, Math.min(20, next)));
                }}
                className="h-10 w-44 bg-background/50 border-white/10 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500/30"
              />
            </div>
            <span className="text-xs text-muted-foreground">{text.rankHint}</span>
          </div>

          {statHeatmap.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
              {text.noHeatmap}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 sm:gap-4">
              {statHeatmap.map((row) => {
                const barWidth =
                  topHeatmapImpact > 0
                    ? Math.max(
                      8,
                      (Math.abs(row.bestImpactPct) / topHeatmapImpact) * 100,
                    )
                    : 0;

                const label = getStatLabel(row.key, elementStats);
                const impactClass =
                  row.bestImpactPct >= 0
                    ? "bg-emerald-500/20 border-emerald-500/25"
                    : "bg-red-500/20 border-red-500/25";
                const impactTextClass =
                  row.bestImpactPct >= 0 ? "text-emerald-300" : "text-red-300";

                return (
                  <div
                    key={row.key}
                    className="rounded-xl border border-white/10 bg-card/50 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {row.key}
                        </div>
                      </div>
                      <Badge className={`${impactClass} ${impactTextClass} border`}>
                        {text.gainRange} {row.minImpactPct >= 0 ? "+" : ""}
                        {row.minImpactPct.toFixed(2)}% → {row.maxImpactPct >= 0 ? "+" : ""}
                        {row.maxImpactPct.toFixed(2)}%
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {text.affixGain}: +{row.minDelta.toFixed(1)} ~ +{row.maxDelta.toFixed(1)}
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${row.bestImpactPct >= 0 ? "bg-emerald-400/80" : "bg-red-400/80"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {Object.entries(STAT_GROUPS).map(([group, keys]) => (
          <section key={group} className="space-y-5">
            {/* ---------- Group Header ---------- */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{group}</h2>
              <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* ---------- Stats Grid ---------- */}
            <div className="grid gap-3 md:grid-cols-2 sm:gap-4">
              {(keys as (StatKey | ElementStatKey)[]).map((k) => {
                const stat = isElementKey(k)
                  ? elementStats[k]
                  : stats[k as StatKey];
                if (!stat) return null;

                const impact = statImpact[k] ?? 0;
                const gear = gearBonus[k] || 0;
                const derivedValue = derived[k as keyof typeof derived] || 0;
                const passiveValue = includedInStatsBonus[k] || 0;
                const base = Number(stat.current || 0);
                const total =
                  Math.round((base + gear + derivedValue + passiveValue) * 100000) /
                  100000;

                return (
                  <StatCard
                    key={k}
                    statKey={k}
                    elementStats={elementStats}
                    impact={impact}
                    gear={gear}
                    derivedValue={derivedValue}
                    passiveValue={passiveValue}
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
            <h2 className="text-lg font-semibold">{text.actions}</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onApplyIncrease}
              className="rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 hover:text-emerald-200"
              variant="secondary"
              type="button"
            >
              {text.applyIncrease}
            </Button>

            <Button
              onClick={onSaveCurrent}
              className="rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 hover:text-amber-200"
              variant="secondary"
              type="button"
            >
              {text.saveCurrent}
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
