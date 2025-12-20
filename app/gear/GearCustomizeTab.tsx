// app\gear\GearCustomizeTab.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useGear } from "../gear/GearContext";
import GearForm from "./GearForm";
import { CustomGear, GearSlot, InputStats, ElementStats } from "@/app/types";
import GearCard from "./GearCard";
import { GEAR_SLOTS } from "@/app/constants";
import { aggregateGearStats } from "@/app/utils/gear";
import { calcAffinityDamage, calcExpectedNormal } from "@/app/utils/damage";
import { calculateDamageUnified } from "@/app/utils/calcDamageUnified";

const MAX_COMBINATIONS = 200_000;
const DEFAULT_MAX_DISPLAY = 200;
const MAX_RESULTS_CAP = 10000;

interface GearCustomizeTabProps {
  stats: InputStats;
  elementStats: ElementStats;
}

interface OptimizeResult {
  key: string;
  damage: number;
  percentGain: number;
  selection: Partial<Record<GearSlot, CustomGear>>;
}

interface OptimizePayload {
  stats: InputStats;
  elementStats: ElementStats;
  customGears: CustomGear[];
  equipped: Partial<Record<GearSlot, string | undefined>>;
}
interface OptimizeComputation {
  baseDamage: number;
  totalCombos: number;
  results: OptimizeResult[];
}

export default function GearCustomizeTab({
  stats,
  elementStats,
}: GearCustomizeTabProps) {
  const {
    customGears,
    setCustomGears,
    equipped,
    setEquipped,
  } = useGear();

  const [open, setOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<CustomGear | null>(null);

  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResults, setOptimizeResults] = useState<OptimizeResult[]>([]);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [combinationCount, setCombinationCount] = useState(0);
  const [baselineDamage, setBaselineDamage] = useState(0);
  const [maxDisplay, setMaxDisplay] = useState(DEFAULT_MAX_DISPLAY);

  const removeGear = (id: string) => {
    setCustomGears((g) => g.filter((x) => x.id !== id));
  };

  const openAddDialog = () => {
    setEditingGear(null);
    setOpen(true);
  };

  const openEditDialog = (gear: CustomGear) => {
    setEditingGear(gear);
    setOpen(true);
  };

  const runOptimization = useCallback(() => {
    setOptimizing(true);
    setOptimizeError(null);
    try {
      const computation = computeOptimizeResults(
        {
          stats,
          elementStats,
          customGears,
          equipped,
        },
        maxDisplay
      );


      setOptimizeResults(computation.results);
      setCombinationCount(computation.totalCombos);
      setBaselineDamage(computation.baseDamage);
    } catch (error) {
      setOptimizeResults([]);
      setCombinationCount(0);
      setBaselineDamage(0);
      setOptimizeError(
        error instanceof Error
          ? error.message
          : "Unable to calculate gear combinations."
      );
    } finally {
      setOptimizing(false);
    }
  }, [stats, customGears, equipped, maxDisplay]);

  useEffect(() => {
    if (optimizeOpen) {
      runOptimization();
    }
  }, [optimizeOpen, runOptimization]);

  const openOptimizeDialog = () => {
    setOptimizeOpen(true);
  };

  const applySelection = (selection: OptimizeResult["selection"]) => {
    setEquipped((prev) => {
      const next: Partial<Record<GearSlot, string>> = { ...prev };
      GEAR_SLOTS.forEach(({ key }) => {
        const gear = selection[key];
        if (gear) {
          next[key] = gear.id;
        } else {
          delete next[key];
        }
      });
      return next;
    });
    setOptimizeOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">Custom Gear</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openOptimizeDialog}>
            Find Optimize Gear
          </Button>
          <Button onClick={openAddDialog}>+ Add Gear</Button>
        </div>
      </div>

      {/* Gear List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customGears.map((g) => (
          <GearCard
            key={g.id}
            gear={g}
            onEdit={() => openEditDialog(g)}
            onDelete={() => removeGear(g.id)}
          />
        ))}
        {customGears.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground border border-dashed border-muted rounded-lg py-6">
            No custom gear yet. Add some items to start optimizing.
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingGear ? "Edit Gear" : "Add New Gear"}
            </DialogTitle>
          </DialogHeader>

          <GearForm
            initialGear={editingGear}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Optimize Dialog */}
      <Dialog open={optimizeOpen} onOpenChange={setOptimizeOpen}>
        <DialogContent className="max-w-4xl md:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Find Optimize Gear</DialogTitle>
          </DialogHeader>

          <div className="max-h-[62vh] overflow-y-auto pr-1">
            {optimizing ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Calculating every gear combination...
              </div>
            ) : optimizeError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {optimizeError}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 text-sm text-muted-foreground">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      Current setup damage:{" "}
                      <span className="font-semibold text-foreground">
                        {formatNumber(baselineDamage)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        Combinations evaluated: {combinationCount.toLocaleString()}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={runOptimization}
                      >
                        Recalculate
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Max results (≤ {MAX_RESULTS_CAP})
                      <Input
                        type="number"
                        min={1}
                        max={MAX_RESULTS_CAP}
                        value={maxDisplay}
                        className="h-8 w-24"
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setMaxDisplay(() => {
                            if (Number.isNaN(next) || next <= 0) return 1;
                            return Math.min(next, MAX_RESULTS_CAP);
                          });
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Currently showing up to {Math.min(maxDisplay, MAX_RESULTS_CAP).toLocaleString()} setups
                    </span>
                  </div>
                </div>

                {optimizeResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add custom gear pieces to generate optimization results.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {optimizeResults.map((result, index) => (
                      <Card key={result.key} className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span
                            className={`text-sm font-semibold ${result.percentGain >= 0
                              ? "text-emerald-500"
                              : "text-red-500"
                              }`}
                          >
                            {formatSignedPercent(result.percentGain)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Estimated Normal Damage
                          </p>
                          <p className="text-2xl font-bold">
                            {formatNumber(result.damage)}
                          </p>
                        </div>
                        <div className="space-y-1 text-xs">
                          {GEAR_SLOTS.map(({ key, label }) => {
                            const gear = result.selection[key];
                            if (!gear) return null;
                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="text-muted-foreground">
                                  {label}
                                </span>
                                <span className="truncate font-medium">
                                  {gear.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => applySelection(result.selection)}
                        >
                          Equip this setup
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function computeOptimizeResults(
  {
    stats,
    elementStats,
    customGears,
    equipped,
  }: OptimizePayload,
  desiredDisplay: number
): OptimizeComputation {
  const baseBonus = aggregateGearStats(customGears, equipped ?? {});
  const baseDamage =
    calculateDamageUnified(stats, elementStats, baseBonus).normal;

  if (customGears.length === 0) {
    return { baseDamage, totalCombos: 0, results: [] };
  }

  const slotOptions = GEAR_SLOTS.map(({ key }) => {
    const available = customGears.filter((g) => g.slot === key);
    return {
      slot: key,
      items: available.length > 0 ? available : [null],
    };
  });

  const estimated = slotOptions.reduce(
    (acc, { items }) => acc * items.length,
    1
  );

  if (estimated > MAX_COMBINATIONS) {
    throw new Error(
      `Too many combinations (${estimated.toLocaleString()}). Remove some gear per slot.`
    );
  }

  const displayLimit = Math.max(1, Math.min(desiredDisplay, MAX_RESULTS_CAP));

  const results: OptimizeResult[] = [];
  const bonus: Record<string, number> = {};
  const selection: Partial<Record<GearSlot, CustomGear>> = {};
  let total = 0;

  const addGear = (gear: CustomGear, dir: 1 | -1) => {
    const attrs = [gear.main, ...gear.subs];
    if (gear.addition) attrs.push(gear.addition);
    attrs.forEach((a) => {
      bonus[a.stat] = (bonus[a.stat] || 0) + dir * a.value;
    });
  };

  const dfs = (i: number) => {
    if (i === slotOptions.length) {
      total++;

      const dmg =
        calculateDamageUnified(stats, elementStats, bonus).normal;

      results.push({
        key: buildSelectionKey(selection),
        damage: dmg,
        percentGain:
          baseDamage === 0 ? 0 : ((dmg - baseDamage) / baseDamage) * 100,
        selection: { ...selection },
      });
      return;
    }

    const { slot, items } = slotOptions[i];

    items.forEach((gear) => {
      if (gear) {
        selection[slot] = gear;
        addGear(gear, 1);
        dfs(i + 1);
        addGear(gear, -1);
        delete selection[slot];
      } else {
        delete selection[slot];
        dfs(i + 1);
      }
    });
  };

  dfs(0);

  results.sort((a, b) =>
    b.percentGain === a.percentGain
      ? b.damage - a.damage
      : b.percentGain - a.percentGain
  );

  return {
    baseDamage,
    totalCombos: total,
    results: results.slice(0, displayLimit),
  };
}

function buildSelectionKey(
  selection: Partial<Record<GearSlot, CustomGear>>
): string {
  return GEAR_SLOTS.map(({ key }) => selection[key]?.id ?? "none").join("|");
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return "+0%";
  const rounded = value.toFixed(2);
  return value >= 0 ? `+${rounded}%` : `${rounded}%`;
}
