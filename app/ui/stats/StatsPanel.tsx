// app/ui/StatsPanel.tsx
"use client";
import React, { useMemo, useRef, useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Loader2 } from "lucide-react";
import { callGeminiVision } from "@/lib/gemini";
import { fileToBase64 } from "@/lib/utils";
import { STATS_OCR_PROMPT, type StatsOcrResult } from "@/app/domain/stats/statsOcrSchema";
import { STAT_GROUPS } from "../../constants";
import { LIST_MARTIAL_ARTS } from "../../domain/skill/types";
import { InputStats, ElementStats } from "../../types";
import StatCard from "./StatCard";
import { SUPPORTED_PLAYER_LEVELS, SUPPORTED_ENEMY_LEVELS } from "@/app/domain/level/levelSettings";
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
  const { t } = useI18n();

  const safeLevelContext = levelContext ?? { playerLevel: 81, enemyLevel: 81 };
  const safeSetPlayerLevel = setPlayerLevel ?? (() => { });
  const safeSetEnemyLevel = setEnemyLevel ?? (() => { });
  // Track local input values for instant UI feedback
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [heatmapLines, setHeatmapLines] = useState(1);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [heatmapCollapsed, setHeatmapCollapsed] = useState(false);
  const [levelsCollapsed, setLevelsCollapsed] = useState(false);
  const [elementsCollapsed, setElementsCollapsed] = useState(false);

  const [ocrLoading, setOcrLoading] = useState(false);
  const statsFileRef = useRef<HTMLInputElement | null>(null);

  const applyOcrResult = (result: StatsOcrResult) => {
    // 1. Update playerLevel & enemyLevel
    if (result.playerLevel !== undefined && setPlayerLevel) {
      setPlayerLevel(result.playerLevel);
    }
    if (result.enemyLevel !== undefined && setEnemyLevel) {
      setEnemyLevel(result.enemyLevel);
    }

    // 2. Set active element
    if (result.activeElement) {
      onElementChange("selected", "selected", result.activeElement);
    }

    // 3. Update Base Attributes (Body, Power, Defense, Agility, Momentum)
    const baseAttributes = ["Body", "Power", "Defense", "Agility", "Momentum"] as const;
    baseAttributes.forEach((attr) => {
      const val = result[attr];
      if (val !== undefined) {
        onStatChange(attr, "current", String(val));
      }
    });

    // 4. Update element stats (all visible elements)
    const ELEMENT_NAMES = ["bellstrike", "stonesplit", "silkbind", "bamboocut"] as const;
    for (const el of ELEMENT_NAMES) {
      const minVal = result[`${el}Min` as keyof StatsOcrResult];
      const maxVal = result[`${el}Max` as keyof StatsOcrResult];
      const penVal = result[`${el}Penetration` as keyof StatsOcrResult];
      const dmgVal = result[`${el}DMGBonus` as keyof StatsOcrResult];
      if (minVal !== undefined) onElementChange(`${el}Min` as keyof ElementStats, "current", String(minVal));
      if (maxVal !== undefined) onElementChange(`${el}Max` as keyof ElementStats, "current", String(maxVal));
      if (penVal !== undefined) onElementChange(`${el}Penetration` as keyof ElementStats, "current", String(penVal));
      if (dmgVal !== undefined) onElementChange(`${el}DMGBonus` as keyof ElementStats, "current", String(dmgVal));
    }

    // Calculate new derived stats immediately to avoid React state stale closure
    const agility = result.Agility !== undefined ? result.Agility : Number(stats.Agility?.current || 0);
    const momentum = result.Momentum !== undefined ? result.Momentum : Number(stats.Momentum?.current || 0);
    const power = result.Power !== undefined ? result.Power : Number(stats.Power?.current || 0);
    const body = result.Body !== undefined ? result.Body : Number(stats.Body?.current || 0);
    const defense = result.Defense !== undefined ? result.Defense : Number(stats.Defense?.current || 0);

    const localDerived = {
      MinPhysicalAttack: (agility + (gearBonus.Agility || 0)) * 0.9 + (power + (gearBonus.Power || 0)) * 0.22,
      MaxPhysicalAttack: (momentum + (gearBonus.Momentum || 0)) * 0.9 + (power + (gearBonus.Power || 0)) * 1.36,
      CriticalRate: (agility + (gearBonus.Agility || 0)) * 0.076,
      AffinityRate: (momentum + (gearBonus.Momentum || 0)) * 0.038,
      HP: (body + (gearBonus.Body || 0)) * 60 + (defense + (gearBonus.Defense || 0)) * 17,
      PhysicalDefense: (defense + (gearBonus.Defense || 0)) * 0.57,
    };

    // 5. Update remaining derived/total stats
    const totalStatsMapping: Array<{ key: string; val?: number }> = [
      { key: "MinPhysicalAttack", val: result.MinPhysicalAttack },
      { key: "MaxPhysicalAttack", val: result.MaxPhysicalAttack },
      { key: "CriticalRate", val: result.CriticalRate },
      { key: "AffinityRate", val: result.AffinityRate },
      { key: "HP", val: result.HP },
      { key: "PhysicalDefense", val: result.PhysicalDefense },
      { key: "PhysicalPenetration", val: result.PhysicalPenetration },
      { key: "PrecisionRate", val: result.PrecisionRate },
    ];

    totalStatsMapping.forEach(({ key, val }) => {
      if (val !== undefined) {
        const gear = gearBonus[key] || 0;
        const derivedValue = localDerived[key as keyof typeof localDerived] || 0;
        const passiveValue = includedInStatsBonus[key] || 0;
        const nextBase = Math.round((val - gear - derivedValue - passiveValue) * 100000) / 100000;
        onStatChange(key as keyof InputStats, "current", String(nextBase));
      }
    });
  };

  const handleStatsOcr = async (files: File[]) => {
    if (!files.length) return;
    setOcrLoading(true);
    try {
      const base64Array = await Promise.all(files.map(fileToBase64));
      const result = await callGeminiVision(base64Array, STATS_OCR_PROMPT) as StatsOcrResult;
      applyOcrResult(result);
      alert(t("ocr.statsSuccess").replace("{count}", String(files.length)));
    } catch (e) {
      console.error(e);
      alert(t("ocr.statsFail"));
    }
    setOcrLoading(false);
  };

  // Debounce timers
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

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
          <button
            type="button"
            onClick={() => setLevelsCollapsed(!levelsCollapsed)}
            className="flex w-full items-center gap-3 group/header cursor-pointer"
          >
            <h2 className="text-lg font-semibold">{t("stats.levels")}</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-200 ${
                levelsCollapsed ? "" : "rotate-180"
              }`}
            />
          </button>

          {!levelsCollapsed && (
            <div className="grid gap-3 md:grid-cols-2 sm:gap-4 animate-in fade-in-0 duration-200">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">{t("stats.playerLevel")}</label>
                <select
                  data-tour="player-level"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={safeLevelContext.playerLevel}
                  onChange={(e) => safeSetPlayerLevel(Number(e.target.value))}
                >
                  {SUPPORTED_PLAYER_LEVELS.map((lv) => (
                    <option key={lv} value={lv}>
                      {lv}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">{t("stats.enemyLevel")}</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={safeLevelContext.enemyLevel}
                  onChange={(e) => safeSetEnemyLevel(Number(e.target.value))}
                >
                  {SUPPORTED_ENEMY_LEVELS.map((lv) => (
                    <option key={lv} value={lv}>
                      {lv}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Element Selection */}
        <section className="space-y-5">
          <button
            type="button"
            onClick={() => setElementsCollapsed(!elementsCollapsed)}
            className="flex w-full items-center gap-3 group/header cursor-pointer"
          >
            <h2 className="text-lg font-semibold">{t("stats.elements")}</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-200 ${
                elementsCollapsed ? "" : "rotate-180"
              }`}
            />
          </button>

          {!elementsCollapsed && (
            <div className="space-y-2 animate-in fade-in-0 duration-200">
              <div className="flex items-baseline justify-between gap-3">
                <label className="text-xs text-muted-foreground">{t("stats.martialArt")}</label>
                <span className="text-[11px] text-muted-foreground">
                  {t("stats.autoSync")}
                </span>
              </div>
              <select
                data-tour="martial-art"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          )}
        </section>

        <section className="space-y-5">
          <button
            type="button"
            onClick={() => setHeatmapCollapsed(!heatmapCollapsed)}
            className="flex w-full items-center gap-3 group/header cursor-pointer"
          >
            <h2 className="text-lg font-semibold">{t("stats.heatmap")}</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-200 ${
                heatmapCollapsed ? "" : "rotate-180"
              }`}
            />
          </button>

          {!heatmapCollapsed && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">{t("stats.lineCount")}</label>
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
                    className="h-10 w-44 bg-background border-input focus-visible:ring-ring/25 focus-visible:border-ring"
                  />
                </div>
                <span className="text-xs text-muted-foreground">{t("stats.rankHint")}</span>
              </div>

              {statHeatmap.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
                  {t("stats.noHeatmap")}
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
                            {t("stats.gainRange")} {row.minImpactPct >= 0 ? "+" : ""}
                            {row.minImpactPct.toFixed(2)}% → {row.maxImpactPct >= 0 ? "+" : ""}
                            {row.maxImpactPct.toFixed(2)}%
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {t("stats.affixGain")}: +{row.minDelta.toFixed(1)} ~ +{row.maxDelta.toFixed(1)}
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
            </div>
          )}
        </section>

        {Object.entries(STAT_GROUPS).map(([group, keys]) => {
          const groupLabels: Record<string, string> = {
            Core: t("stats.groupCore"),
            Attributes: t("stats.groupAttr"),
            Element: t("stats.groupElem"),
            Rates: t("stats.groupRates"),
            Defense: t("stats.groupDef"),
          };
          return (
          <section key={group} className="space-y-5">
            {/* ---------- Group Header ---------- */}
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="flex w-full items-center gap-3 group/header cursor-pointer"
            >
              <h2 className="text-lg font-semibold">{groupLabels[group] ?? group}</h2>
              <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform duration-200 ${
                  collapsedGroups.has(group) ? "" : "rotate-180"
                }`}
              />
            </button>

            {/* ---------- Stats Grid ---------- */}
            {!collapsedGroups.has(group) && (
              <div className="grid gap-3 md:grid-cols-2 sm:gap-4 animate-in fade-in-0 duration-200">
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
            )}
          </section>
          );
        })}

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{t("stats.actions")}</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onApplyIncrease}
              className="rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 hover:text-emerald-200"
              variant="secondary"
              type="button"
            >
              {t("stats.applyIncrease")}
            </Button>

            <Button
              onClick={onSaveCurrent}
              className="rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 hover:text-amber-200"
              variant="secondary"
              type="button"
            >
              {t("stats.saveCurrent")}
            </Button>
          </div>

          <Button
            data-tour="stats-ocr"
            onClick={() => statsFileRef.current?.click()}
            className="w-full rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/25 hover:bg-sky-500/25 hover:text-sky-200"
            variant="secondary"
            type="button"
            disabled={ocrLoading}
          >
            {ocrLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("ocr.processing")}
              </>
            ) : (
              t("ocr.statsButton")
            )}
          </Button>

          <input
            ref={statsFileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = e.target.files;
              if (!files?.length) return;
              handleStatsOcr(Array.from(files));
              e.target.value = "";
            }}
          />
        </section>
      </CardContent>
    </Card>
  );
}
