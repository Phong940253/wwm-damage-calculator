"use client";

import React, { useEffect, useState } from "react";
import type { IdealGearResult } from "@/app/domain/gear/idealOptimizer";
import { ELEMENT_TYPES, ElementKey, STAT_LABELS } from "@/app/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Loader2, Target, TrendingUp, Cpu } from "lucide-react";
import { useDamage } from "@/app/hooks/useDamage";
import { DamageResult } from "@/app/domain/damage/type";
import { Rotation } from "@/app/types";
import { useStats } from "@/app/hooks/useStats";
import { useElementStats } from "@/app/hooks/useElementStats";
import { INITIAL_STATS, INITIAL_ELEMENT_STATS } from "@/app/constants";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import DamagePanel from "@/app/ui/damage/DamagePanel";
import { useIdealGearOptimize } from "@/app/hooks/useIdealGearOptimize";

import { distributeStatsToGears, IdealGear } from "@/app/domain/gear/idealOptimizer";

export default function GearIdealTab({ rotation }: { rotation?: Rotation }) {
  const [path, setPath] = useState<ElementKey>("bellstrike");
  const maxWorkers =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ? Math.max(1, navigator.hardwareConcurrency)
      : 4;
  const [workerCount, setWorkerCount] = useState(maxWorkers);

  useEffect(() => {
    setWorkerCount((prev) => Math.min(prev, maxWorkers));
  }, [maxWorkers]);

  const { stats } = useStats(INITIAL_STATS);
  const { elementStats } = useElementStats(INITIAL_ELEMENT_STATS);
  const { loading, progress, result, setResult, error, run, cancel, mode } =
    useIdealGearOptimize(stats, elementStats, rotation);

  const gears = React.useMemo(() => {
    if (!result) return [];
    return distributeStatsToGears(result);
  }, [result]);

  const damageResult = useDamage(
    stats,
    elementStats,
    result?.stats || {},
    rotation
  );

  const handleCalculate = () => {
    run(path, { mode: "exhaustive", workers: workerCount });
  };

  const handleFastCalculate = () => {
    run(path, { mode: "fast", timeMs: 60_000, workers: workerCount });
  };

  const handleSuperFastCalculate = () => {
    run(path, { mode: "fast", timeMs: 10_000, workers: workerCount });
  };

  // Load from localStorage
  useEffect(() => {
    if (loading) return;
    try {
      const rotationKey =
        (rotation?.skills ?? []).map((s) => s.id).join(",") || "no-rot";
      const storageKey = `idealGearResult:${path}:${rotationKey}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.result && parsed.result.path === path) {
          setResult(parsed.result);
        }
      } else {
        // If no saved result for this path/rotation, and the current result 
        // doesn't match the current path, clear it.
        if (result && result.path !== path) {
          setResult(null);
        }
      }
    } catch {
      // ignore
    }
  }, [path, rotation, loading, setResult]);

  useEffect(() => {
    if (!result) return;
    try {
      const rotationKey =
        (rotation?.skills ?? []).map((s) => s.id).join(",") || "no-rot";
      localStorage.setItem(
        `idealGearResult:${result.path}:${rotationKey}`,
        JSON.stringify({ result, ts: Date.now() })
      );
    } catch {
      // ignore storage errors
    }
  }, [result, rotation]);

  const getStatLabel = (key: string) => STAT_LABELS[key] || key;

  const progressPct =
    progress.total > 0
      ? Math.min(100, (progress.current / progress.total) * 100)
      : 0;

  const progressLabel =
    mode === "fast"
      ? `${Math.ceil(progress.current / 1000)}s / ${Math.ceil(
        progress.total / 1000,
      )}s`
      : `${Math.min(progress.current, progress.total).toLocaleString()} / ${progress.total.toLocaleString()}`;

  const insightText =
    result?.mode === "fast"
      ? "Fast search ran for 1 minute and found a strong candidate (not guaranteed optimal)."
      : "Exhaustive search evaluated all combinations and found the optimal distribution.";

  return (
    <div className="space-y-4 pb-20">
      {/* Configuration Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-400">
            <Cpu size={20} />
            Theoretical Ideal Gear Optimizer
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Calculate the mathematically perfect distribution of 48 tune lines to maximize Normal Damage.
            <br />
            <span className="text-xs text-amber-500/80 mt-1 block">
              * Optimization based on {rotation?.skills.length ? "the active Skill Rotation" : "a single normal attack"} and Level 91 stats.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="w-full sm:w-40 space-y-2">
              <label className="text-sm font-medium text-zinc-300">Workers</label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={workerCount}
                onChange={(e) => setWorkerCount(Number(e.target.value))}
              >
                {Array.from({ length: maxWorkers }, (_, i) => i + 1).map(
                  (count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ),
                )}
              </select>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Zap size={16} className="mr-2" />
                  Find Max Damage
                </>
              )}
            </Button>
            <Button
              onClick={handleFastCalculate}
              disabled={loading}
              variant="outline"
              className="w-full sm:w-auto border-emerald-500/40 text-emerald-200"
            >
              Fast 1 min
            </Button>
            <Button
              onClick={handleSuperFastCalculate}
              disabled={loading}
              variant="outline"
              className="w-full sm:w-auto border-emerald-500/40 text-emerald-200"
            >
              Fast 10s
            </Button>
            {loading && (
              <Button
                onClick={cancel}
                variant="outline"
                className="w-full sm:w-auto border-emerald-500/40 text-emerald-200"
              >
                Cancel
              </Button>
            )}
          </div>
          {loading && progress.total > 0 && (
            <div className="mt-4 space-y-2">
              <Progress value={progressPct} className="h-2 bg-zinc-800" />
              <div className="text-xs text-zinc-400">{progressLabel}</div>
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {result && (
        <Card className="bg-zinc-900/80 border-emerald-900/50 shadow-lg shadow-emerald-900/10">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-950/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-emerald-400 flex items-center gap-2">
                  Optimal Distribution
                  {result.mode === "fast" && (
                    <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                      Fast
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  For {ELEMENT_TYPES.find(e => e.key === result.path)?.label} Path
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Theoretical Max Damage</div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 flex items-center justify-end gap-2">
                  <TrendingUp size={24} className="text-amber-500" />
                  {result ? Math.floor(damageResult.normal.value).toLocaleString() : "-"}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Gear Grid Visualization */}
            <div className="mb-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Side: Gears 1, 2, 3, 4 */}
              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const gear = gears[idx];
                  if (!gear) return null;
                  return <IdealGearCard key={idx} gear={gear} getStatLabel={getStatLabel} />;
                })}
              </div>
              {/* Right Side: Gears 5, 6, 7, 8 */}
              <div className="grid grid-cols-2 gap-4">
                {[4, 5, 6, 7].map((idx) => {
                  const gear = gears[idx];
                  if (!gear) return null;
                  return <IdealGearCard key={idx} gear={gear} getStatLabel={getStatLabel} />;
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(result.allocations).sort((a, b) => b[1] - a[1]).map(([statKey, lines]) => {
                const totalVal = result.stats[statKey];

                return (
                  <div key={statKey} className="flex flex-col p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/80 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 group-hover:bg-emerald-400 transition-colors" />

                    <div className="flex justify-between items-start mb-2 pl-2">
                      <span className="text-sm font-medium text-zinc-300 leading-tight">
                        {getStatLabel(statKey)}
                      </span>
                      <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 whitespace-nowrap">
                        {lines} lines
                      </Badge>
                    </div>

                    <div className="mt-auto pl-2 flex items-center gap-1.5">
                      <Target size={14} className="text-zinc-500" />
                      <span className="text-lg font-bold text-zinc-100">
                        +{(totalVal || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 rounded-md bg-emerald-950/20 border border-emerald-900/30 text-sm text-emerald-200/80">
              <span className="font-semibold text-emerald-400">Insight:</span> {insightText}
            </div>

            <FinalIdealStatsDisplay result={result} rotation={rotation} damageResult={damageResult} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const getStatColor = (key: string) => {
  if (key.includes("Attack") || key === "Power") return "text-red-400";
  if (key.includes("Rate") || key.includes("Critical") || key.includes("Affinity")) return "text-emerald-400";
  if (key.includes("Boost") || key.includes("DMGBonus")) return "text-sky-400";
  if (key.includes("Momentum") || key.includes("bellstrike")) return "text-purple-400";
  if (key.includes("Penetration")) return "text-orange-400";
  return "text-zinc-400";
};

function IdealGearCard({ gear, getStatLabel }: { gear: IdealGear, getStatLabel: (k: string) => string }) {
  return (
    <div className="flex flex-col rounded-xl bg-zinc-900/40 border border-zinc-800/60 shadow-sm hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden h-full">
      {/* Header */}
      <div className="bg-zinc-900/80 px-3 py-2 border-b border-zinc-800/80 flex justify-between items-center group-hover:bg-zinc-800/90 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[10px] font-black text-zinc-500 tracking-widest">GEAR-{gear.id.toString().padStart(2, '0')}</span>
        </div>
        <Badge variant="outline" className="h-4 text-[9px] border-zinc-700 text-zinc-500 uppercase px-1.5 font-bold">Optimal</Badge>
      </div>

      <div className="p-3 space-y-2.5 flex-grow">
        {/* Slot 1: Special Line (The "Primary") */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-2.5 border border-amber-500/20 shadow-[inset_0_0_12px_rgba(245,158,11,0.05)]">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap size={14} className="fill-amber-400/20" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter leading-none mb-0.5">Primary Slot</span>
              <span className="text-xs font-bold text-amber-200 leading-tight">
                {getStatLabel(gear.specialLine)}
              </span>
            </div>
          </div>
          <div className="absolute -top-1 -right-1 p-1 opacity-[0.03] rotate-12">
            <Cpu size={48} />
          </div>
        </div>

        {/* Slots 2-6: Tuning Lines */}
        <div className="space-y-1">
          {gear.tuningLines.map((stat, i) => {
            const isFixed = i === 4; // Slot 6
            const statColor = isFixed ? "text-blue-300" : getStatColor(stat);
            
            return (
              <div 
                key={i} 
                className={`
                  flex items-center justify-between px-2.5 py-2 rounded-md text-[11px] font-medium transition-all duration-200
                  ${isFixed 
                    ? "bg-blue-500/10 border border-blue-500/20 shadow-[inset_0_0_8px_rgba(59,130,246,0.05)]" 
                    : "bg-zinc-950/40 border border-zinc-800/40 hover:bg-zinc-800/60 hover:border-zinc-700/60"
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  {isFixed ? (
                    <Target size={12} className="text-blue-400" />
                  ) : (
                    <div className={`w-1 h-1 rounded-full ${statColor.replace('text', 'bg').replace('400', '500/50')}`} />
                  )}
                  <span className={`truncate max-w-[140px] ${statColor}`}>{getStatLabel(stat)}</span>
                </div>
                
                {isFixed && (
                  <Badge className="h-4 text-[8px] bg-blue-500/20 text-blue-400 border border-blue-400/20 px-1 uppercase font-black tracking-tighter">Fixed</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FinalIdealStatsDisplay({ result, rotation, damageResult }: { result: IdealGearResult, rotation?: Rotation, damageResult: DamageResult }) {
  const { stats } = useStats(INITIAL_STATS);
  const { elementStats } = useElementStats(INITIAL_ELEMENT_STATS);

  const finalCtx = React.useMemo(() => {
    const gearBonus = result.stats;
    const includedAbs = computeIncludedInStatsGearBonus(
      stats,
      elementStats,
      rotation, // Pass rotation to correctly evaluate rotation damage!
      gearBonus
    );

    const effectiveGearBonus = sumBonuses(gearBonus, includedAbs);
    const rotationBonuses = computeRotationBonuses(
      stats,
      elementStats,
      effectiveGearBonus,
      rotation // Pass rotation!
    );

    return buildDamageContext(
      stats,
      elementStats,
      sumBonuses(effectiveGearBonus, rotationBonuses)
    );
  }, [stats, elementStats, rotation, result]);

  return (
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
  );
}
