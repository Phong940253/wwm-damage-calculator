"use client";

import React, { useState, useMemo } from "react";
import { ELEMENT_TYPES, ElementKey, STAT_LABELS } from "@/app/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Beaker, Target, TrendingUp, Trash2, AlertCircle } from "lucide-react";
import { useDamage } from "@/app/hooks/useDamage";
import { Rotation } from "@/app/types";
import { useStats } from "@/app/hooks/useStats";
import { useElementStats } from "@/app/hooks/useElementStats";
import { INITIAL_STATS, INITIAL_ELEMENT_STATS } from "@/app/constants";
import { sumBonuses } from "@/app/domain/skill/modifierEngine";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { computeRotationBonusesWithBreakdown } from "@/app/domain/skill/modifierEngine";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import DamagePanel from "@/app/ui/damage/DamagePanel";
import {
  distributeStatsToGears,
  getIdealGearBaseBonus,
  buildRuleSet,
  getValPerLine,
} from "@/app/domain/gear/idealOptimizer";
import { CANDIDATE_STATS, SINGLE_LINE_STATS } from "@/app/domain/gear/gearConstants";
import { IdealGear, IdealGearResult } from "@/app/domain/gear/types";

// --- Utilities ---

interface IdealGearWithValues extends IdealGear {
  lineValues: Record<string, number | null>;
}

/**
 * Finds a valid sequence of 8 special lines from the total allocations that satisfies pool rules.
 */
function findValidSpecialLines(allocations: Record<string, number>, path: ElementKey): string[] | null {
  const ruleSet = buildRuleSet(path);
  const pools = ruleSet.specialLinePools;
  const result: string[] = [];
  const currentCounts = { ...allocations };

  function backtrack(slot: number): boolean {
    if (slot === 8) return true;

    const pool = pools[slot];
    for (const stat of pool) {
      if ((currentCounts[stat] || 0) > 0) {
        // Check exclusive rule if needed (already mostly handled by user input, but good to be safe)
        if (SINGLE_LINE_STATS.has(stat) && result.includes(stat)) continue;

        result.push(stat);
        currentCounts[stat]--;
        if (backtrack(slot + 1)) return true;
        currentCounts[stat]++;
        result.pop();
      }
    }
    return false;
  }

  if (backtrack(0)) return result;
  return null;
}

// --- Components ---

function IdealGearCard({
  gear,
  getStatLabel,
  hoveredStat,
  setHoveredStat,
}: {
  gear: IdealGearWithValues;
  getStatLabel: (k: string) => string;
  hoveredStat: string | null;
  setHoveredStat: (stat: string | null) => void;
}) {
  const getStatColor = (key: string) => {
    if (key === "MaxPhysicalAttack") return "text-red-400";
    if (key === "Power") return "text-orange-400";
    if (key === "Momentum") return "text-purple-400";
    if (key === "bellstrikeMax") return "text-indigo-400";
    if (key.includes("Attack")) return "text-red-300";
    if (key.includes("Rate") || key.includes("Critical") || key.includes("Affinity")) return "text-emerald-400";
    if (key.includes("Boost") || key.includes("DMGBonus")) return "text-sky-400";
    if (key.includes("Penetration")) return "text-pink-400";
    return "text-zinc-400";
  };

  const formatLineValue = (value: number | null | undefined): string | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return value.toFixed(1);
  };

  return (
    <div className="flex flex-col rounded-xl bg-zinc-900/40 border border-zinc-800/60 shadow-sm hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden h-full">
      <div className="bg-zinc-900/80 px-3 py-2 border-b border-zinc-800/80 flex justify-between items-center group-hover:bg-zinc-800/90 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[10px] font-black text-zinc-500 tracking-widest">GEAR-{gear.id.toString().padStart(2, '0')}</span>
        </div>
        <Badge variant="outline" className="h-4 text-[9px] border-zinc-700 text-zinc-500 uppercase px-1.5 font-bold">Lab Result</Badge>
      </div>

      <div className="p-3 space-y-2.5 flex-grow">
        <div
          className={`relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-2.5 border border-amber-500/20 shadow-[inset_0_0_12px_rgba(245,158,11,0.05)] transition-all ${hoveredStat === gear.specialLine ? 'ring-2 ring-emerald-500/50' : ''}`}
          onMouseEnter={() => setHoveredStat(gear.specialLine)}
          onMouseLeave={() => setHoveredStat(null)}
        >
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Beaker size={14} className="fill-amber-400/20" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter leading-none mb-0.5">Primary Slot</span>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-bold leading-tight ${getStatColor(gear.specialLine)}`}>
                  {getStatLabel(gear.specialLine)}
                </span>
                {gear.lineValues[gear.specialLine] !== null && (
                  <span className="text-xs font-bold text-amber-300 tabular-nums whitespace-nowrap">
                    +{formatLineValue(gear.lineValues[gear.specialLine])}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          {gear.tuningLines.map((stat: string, i: number) => {
            const isFixed = i === 4;
            const statColor = isFixed ? "text-blue-300" : getStatColor(stat);
            const isHighlighted = hoveredStat === stat;

            return (
              <div
                key={i}
                className={`
                  flex items-center justify-between px-2.5 py-2 rounded-md text-[11px] font-medium transition-all duration-200
                  ${isFixed
                    ? "bg-blue-500/10 border border-blue-500/20 shadow-[inset_0_0_8px_rgba(59,130,246,0.05)]"
                    : isHighlighted
                      ? "bg-emerald-500/20 border border-emerald-500/40"
                      : "bg-zinc-950/40 border border-zinc-800/40 hover:bg-zinc-800/60 hover:border-zinc-700/60"
                  }
                `}
                onMouseEnter={() => setHoveredStat(stat)}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <div className="flex items-center gap-2.5">
                  {isFixed ? (
                    <Target size={12} className="text-blue-400" />
                  ) : (
                    <div className={`w-1 h-1 rounded-full ${statColor.replace('text', 'bg').replace('400', '500/50')}`} />
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className={`truncate max-w-[140px] ${statColor}`}>{getStatLabel(stat)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {gear.lineValues[stat] !== null && (
                    <span className={`text-[10px] font-semibold tabular-nums whitespace-nowrap ${isFixed ? "text-blue-200" : "text-zinc-400"}`}>
                      +{formatLineValue(gear.lineValues[stat])}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function GearLabTab({ rotation }: { rotation?: Rotation }) {
  const [path, setPath] = useState<ElementKey>("bellstrike");
  const [userCounts, setUserCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    CANDIDATE_STATS.forEach(s => initial[s] = 0);
    return initial;
  });
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [result, setResult] = useState<IdealGearResult | null>(null);

  const { stats } = useStats(INITIAL_STATS);
  const { elementStats } = useElementStats(INITIAL_ELEMENT_STATS);

  const totalLines = useMemo(() => Object.values(userCounts).reduce((a, b) => a + b, 0), [userCounts]);

  const handleStatChange = (stat: string, val: string) => {
    const num = parseInt(val) || 0;
    setUserCounts(prev => ({ ...prev, [stat]: Math.max(0, num) }));
  };

  const clearAll = () => {
    const initial: Record<string, number> = {};
    CANDIDATE_STATS.forEach(s => initial[s] = 0);
    setUserCounts(initial);
    setResult(null);
    setSolveError(null);
  };

  const handleDistribute = () => {
    setSolveError(null);
    const ruleSet = buildRuleSet(path);

    // Validate exclusive stats
    const exclusiveStats = ["CombatBoostAgainstBossUnits", "ArtOfSwordDMGBoost", "AllMartialArtsBoost"];
    for (const stat of exclusiveStats) {
      if ((userCounts[stat] || 0) > 1) {
        setSolveError(`${STAT_LABELS[stat] || stat} cannot exceed 1 line.`);
        return;
      }
    }

    if (totalLines !== 40) {
      setSolveError(`Total random lines must be exactly 40 (you have ${totalLines}).`);
      return;
    }

    // Try to find valid special lines
    const specialLines = findValidSpecialLines(userCounts, path);
    if (!specialLines) {
      setSolveError("Cannot find a valid distribution for special slots 1-8 based on your counts.");
      return;
    }

    // Prepare IdealGearResult
    const allocations: Record<string, number> = { ...userCounts };
    // Add fixed lines
    for (const [stat, { lines }] of Object.entries(ruleSet.fixedLineStats)) {
      allocations[stat] = (allocations[stat] || 0) + lines;
    }

    const finalStats: Record<string, number> = {};
    const baseGearBonus = getIdealGearBaseBonus(path);
    for (const stat of Object.keys(allocations)) {
      const val = getValPerLine(stat);
      finalStats[stat] = (baseGearBonus[stat] || 0) + allocations[stat] * val;
    }

    setResult({
      path,
      allocations,
      stats: finalStats,
      specialLines,
      maxDamage: 0, // Will be computed by useDamage
    });
  };

  const gears = React.useMemo(() => {
    if (!result) return [];
    const distributed = distributeStatsToGears(result);
    return distributed.map((gear) => {
      const lineValues: Record<string, number | null> = {
        [gear.specialLine]: getValPerLine(gear.specialLine),
      };
      for (const stat of gear.tuningLines) {
        lineValues[stat] = getValPerLine(stat);
      }
      return { ...gear, lineValues };
    });
  }, [result]);

  const damageResult = useDamage(stats, elementStats, result?.stats || {}, rotation);

  const finalCtx = React.useMemo(() => {
    if (!result) return null;
    const gearBonus = result.stats;
    const includedAbs = computeIncludedInStatsGearBonus(
      stats,
      elementStats,
      rotation,
      gearBonus
    );

    const effectiveGearBonus = sumBonuses(gearBonus, includedAbs);

    const breakdown = computeRotationBonusesWithBreakdown(
      stats,
      elementStats,
      effectiveGearBonus,
      rotation
    );

    const combinedBonus = sumBonuses(effectiveGearBonus, breakdown.total);

    return buildDamageContext(
      stats,
      elementStats,
      combinedBonus,
      {
        gear: effectiveGearBonus,
        passives: Object.fromEntries(
          Object.entries(breakdown.byPassive).map(([id, bonus]) => [
            id,
            {
              name: breakdown.meta.passives[id]?.name ?? id,
              uptimePct: breakdown.meta.passives[id]?.uptimePct,
              bonus,
            },
          ]),
        ),
        innerWays: Object.fromEntries(
          Object.entries(breakdown.byInnerWay).map(([id, bonus]) => [
            id,
            { name: breakdown.meta.innerWays[id]?.name ?? id, bonus },
          ]),
        ),
      }
    );
  }, [stats, elementStats, rotation, result]);

  return (
    <div className="space-y-4 pb-20">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-400">
            <Beaker size={20} />
            Gear Lab
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Manually enter your total stat lines (exactly 40) and see how they can be distributed across 8 gears.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-64 space-y-2">
                <label className="text-sm font-medium text-zinc-300">Elemental Path</label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={path}
                  onChange={(e) => setPath(e.target.value as ElementKey)}
                >
                  {ELEMENT_TYPES.map((el) => (
                    <option key={el.key} value={el.key}>
                      {el.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={handleDistribute} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white">
                  Distribute
                </Button>
                <Button onClick={clearAll} variant="outline" className="flex-1 sm:flex-none border-red-500/40 text-red-200 hover:bg-red-500/10">
                  <Trash2 size={16} className="mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {CANDIDATE_STATS.map(stat => (
                <div key={stat} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase truncate block">
                    {STAT_LABELS[stat] || stat}
                  </label>
                  <Input
                    type="number"
                    value={userCounts[stat]}
                    onChange={(e) => handleStatChange(stat, e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus:ring-emerald-500/50 h-9"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950/50 border border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Total lines:</span>
                <Badge className={`${totalLines === 40 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {totalLines} / 40
                </Badge>
              </div>
              {solveError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle size={14} />
                  {solveError}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-zinc-900/80 border-emerald-900/50 shadow-lg shadow-emerald-900/10">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-950/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-emerald-400 flex items-center gap-2">
                  Lab Distribution
                </CardTitle>
                <CardDescription>
                  For {ELEMENT_TYPES.find(e => e.key === result.path)?.label} Path
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Projected Damage</div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 flex items-center justify-end gap-2">
                  <TrendingUp size={24} className="text-amber-500" />
                  {Math.floor(damageResult.normal.value).toLocaleString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const gear = gears[idx];
                  if (!gear) return null;
                  return <IdealGearCard key={idx} gear={gear} getStatLabel={(k) => STAT_LABELS[k] || k} hoveredStat={hoveredStat} setHoveredStat={setHoveredStat} />;
                })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[4, 5, 6, 7].map((idx) => {
                  const gear = gears[idx];
                  if (!gear) return null;
                  return <IdealGearCard key={idx} gear={gear} getStatLabel={(k) => STAT_LABELS[k] || k} hoveredStat={hoveredStat} setHoveredStat={setHoveredStat} />;
                })}
              </div>
            </div>

            {finalCtx && (
              <div className="mt-8 space-y-4">
                <div className="text-sm text-amber-400 mb-4 bg-amber-500/10 p-3 rounded-md border border-amber-500/20">
                  Note: The stats below INCLUDE the buffs from your active Rotation (Passive Skills & Inner Ways).
                </div>
                <DamagePanel
                  ctx={finalCtx}
                  result={damageResult}
                  showFormula={false}
                  toggleFormula={() => { }}
                  elementStats={elementStats}
                  rotation={rotation}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
