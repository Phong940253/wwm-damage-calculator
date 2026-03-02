"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CustomGear, ElementStats, InputStats, Rotation } from "../../types";
import { useGear } from "../../providers/GearContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStatLabel } from "@/app/utils/statLabel";
import { StatType } from "@/app/domain/gear/types";
import { STAT_BG } from "@/app/domain/gear/constants";
import {
  GEAR_SLOTS,
  STAT_HEATMAP_AFFIX_LIMITS,
  type StatHeatmapKey,
} from "@/app/constants";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { SKILLS } from "@/app/domain/skill/skills";
import { calculateSkillDamage } from "@/app/domain/skill/skillDamage";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { useI18n } from "@/app/providers/I18nProvider";
import {
  getTuneSystemStatPool,
  hasUsedTune,
  isTuneTargetAllowedBySubRules,
} from "@/app/domain/gear/tuneAdvisor";

function calcRotationAwareNormalDamage(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation,
): number {
  const includedAbs = computeIncludedInStatsGearBonus(
    stats,
    elementStats,
    rotation,
    gearBonus
  );
  const effectiveGearBonus = sumBonuses(gearBonus, includedAbs);

  const rotationBonuses = computeRotationBonuses(
    stats,
    elementStats,
    effectiveGearBonus,
    rotation
  );

  const ctx = buildDamageContext(
    stats,
    elementStats,
    sumBonuses(effectiveGearBonus, rotationBonuses)
  );

  if (rotation && rotation.skills.length > 0) {
    let totalNormal = 0;
    for (const rotSkill of rotation.skills) {
      const skill = SKILLS.find((s) => s.id === rotSkill.id);
      if (!skill) continue;
      const dmg = calculateSkillDamage(ctx, skill, { params: rotSkill.params });
      totalNormal += dmg.total.normal.value * rotSkill.count;
    }
    return totalNormal;
  }

  return calculateDamage(ctx).normal || 0;
}

function normalizeRarity(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function getRarityPillClass(rarity: string): string {
  const r = normalizeRarity(rarity);

  // Common synonyms / variants
  if (r === "common" || r === "normal") {
    return "bg-slate-500/15 text-slate-200 border-slate-400/20";
  }
  if (r === "uncommon") {
    return "bg-lime-500/15 text-lime-200 border-lime-400/20";
  }
  if (r === "rare") {
    return "bg-sky-500/15 text-sky-200 border-sky-400/20";
  }
  if (r === "epic") {
    return "bg-violet-500/15 text-violet-200 border-violet-400/20";
  }
  if (r === "legendary") {
    return "bg-amber-500/15 text-amber-200 border-amber-400/20";
  }

  // Fallback for custom rarities
  return "bg-background/30 text-muted-foreground border-white/10";
}

interface Props {
  gear: CustomGear;
  elementStats?: ElementStats;
  stats: InputStats;
  rotation?: Rotation;
  onEdit: (gear: CustomGear) => void;
  onDelete: (gearId: string) => void;
}

/* =======================
   Component
======================= */

export default function GearCard({ gear, elementStats, stats, rotation, onEdit, onDelete }: Props) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      equipped: "Đang trang bị",
      gearActions: "Hành động trang bị",
      unequip: "Tháo",
      equip: "Trang bị",
      edit: "Sửa",
      delete: "Xóa",
      main: "Chính",
      sub: "Phụ",
      bonus: "Thưởng",
      showTune: "Tune",
      tuneTitle: "Tune Preview",
      availableStat: "Stat có thể ra",
      expected: "Kỳ vọng",
      bestCase: "Best-case",
      noTuneLine: "Không có dòng phụ hợp lệ để tune.",
    }
    : {
      equipped: "Equipped",
      gearActions: "Gear actions",
      unequip: "Unequip",
      equip: "Equip",
      edit: "Edit",
      delete: "Delete",
      main: "Main",
      sub: "Sub",
      bonus: "Bonus",
      showTune: "Tune",
      tuneTitle: "Tune Preview",
      availableStat: "Available stat",
      expected: "Expected",
      bestCase: "Best-case",
      noTuneLine: "No valid sub-line to tune.",
      tunedLocked: "This gear has already been tuned and cannot be tuned again.",
    };

  const { customGears, equipped, setEquipped } = useGear();
  const isEquipped = equipped[gear.slot] === gear.id;

  // Performance: computing impact % requires multiple damage recalcs per line.
  // Defer until the card is near viewport and the browser is idle.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [impactEnabled, setImpactEnabled] = useState(false);
  const [tuneDialogOpen, setTuneDialogOpen] = useState(false);

  useEffect(() => {
    if (impactEnabled) return;
    const el = rootRef.current;
    if (!el) return;

    let cancelled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        observer.disconnect();

        const enable = () => {
          if (cancelled) return;
          setImpactEnabled(true);
        };

        const w = window as unknown as {
          requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
          cancelIdleCallback?: (handle: number) => void;
        };

        if (typeof w.requestIdleCallback === "function") {
          w.requestIdleCallback(enable, { timeout: 800 });
        } else {
          // Let the initial paint finish first.
          window.setTimeout(enable, 50);
        }
      },
      {
        root: null,
        rootMargin: "800px 0px",
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [impactEnabled]);

  const slotLabel =
    GEAR_SLOTS.find((s) => s.key === gear.slot)?.label ?? String(gear.slot);

  const equip = () => {
    setEquipped((prev) => ({
      ...prev,
      [gear.slot]: gear.id,
    }));
  };

  const unequip = () => {
    setEquipped((prev) => {
      const next = { ...prev };
      delete next[gear.slot];
      return next;
    });
  };

  /** 🔁 backward compatibility */
  const mains = useMemo(() => {
    return gear.mains?.length ? gear.mains : gear.main ? [gear.main] : [];
  }, [gear.mains, gear.main]);

  const baseline = useMemo(() => {
    if (!impactEnabled || !elementStats) return null;

    // Baseline: keep other equipped slots, but remove THIS slot
    const equippedWithoutSlot = { ...equipped };
    delete (equippedWithoutSlot as Record<string, string>)[gear.slot];

    const bonusWithoutSlot = aggregateEquippedGearBonus(
      customGears,
      equippedWithoutSlot
    );

    const base = calcRotationAwareNormalDamage(
      stats,
      elementStats,
      bonusWithoutSlot,
      rotation
    );

    return {
      base,
      bonusWithoutSlot,
    };
  }, [impactEnabled, elementStats, equipped, gear.slot, customGears, stats, rotation]);

  const impactPctByLineKey = useMemo(() => {
    if (!baseline || baseline.base <= 0 || !elementStats) {
      return {} as Record<string, number>;
    }

    const { base, bonusWithoutSlot } = baseline;
    const result: Record<string, number> = {};

    // Main lines (rendered as mains)
    mains.forEach((m, i) => {
      const statKey = String(m.stat);
      const value = Number(m.value ?? 0);
      if (!value) return;
      const testBonus = { ...bonusWithoutSlot };
      testBonus[statKey] = (testBonus[statKey] ?? 0) + value;
      const dmg = calcRotationAwareNormalDamage(
        stats,
        elementStats,
        testBonus,
        rotation
      );
      result[`mains:${i}`] = ((dmg - base) / base) * 100;
    });

    // Sub lines
    (gear.subs ?? []).forEach((s, i) => {
      const statKey = String(s.stat);
      const value = Number(s.value ?? 0);
      if (!value) return;
      const testBonus = { ...bonusWithoutSlot };
      testBonus[statKey] = (testBonus[statKey] ?? 0) + value;
      const dmg = calcRotationAwareNormalDamage(
        stats,
        elementStats,
        testBonus,
        rotation
      );
      result[`subs:${i}`] = ((dmg - base) / base) * 100;
    });

    // Bonus/addition
    if (gear.addition) {
      const statKey = String(gear.addition.stat);
      const value = Number(gear.addition.value ?? 0);
      if (value) {
        const testBonus = { ...bonusWithoutSlot };
        testBonus[statKey] = (testBonus[statKey] ?? 0) + value;
        const dmg = calcRotationAwareNormalDamage(
          stats,
          elementStats,
          testBonus,
          rotation
        );
        result["addition:0"] = ((dmg - base) / base) * 100;
      }
    }

    return result;
  }, [baseline, elementStats, gear.subs, gear.addition, mains, stats, rotation]);

  const impactPctNoMain = useMemo(() => {
    if (!baseline || baseline.base <= 0 || !elementStats) return 0;
    const { base, bonusWithoutSlot } = baseline;

    const testBonus = { ...bonusWithoutSlot };

    // Apply subs + addition only
    (gear.subs ?? []).forEach((s) => {
      const statKey = String(s.stat);
      const value = Number(s.value ?? 0);
      if (!value) return;
      testBonus[statKey] = (testBonus[statKey] ?? 0) + value;
    });

    if (gear.addition) {
      const statKey = String(gear.addition.stat);
      const value = Number(gear.addition.value ?? 0);
      if (value) testBonus[statKey] = (testBonus[statKey] ?? 0) + value;
    }

    const dmg = calcRotationAwareNormalDamage(
      stats,
      elementStats,
      testBonus,
      rotation
    );
    return ((dmg - base) / base) * 100;
  }, [baseline, elementStats, gear.subs, gear.addition, stats, rotation]);

  const impactPctTotal = useMemo(() => {
    if (!baseline || baseline.base <= 0 || !elementStats) return 0;
    const { base, bonusWithoutSlot } = baseline;

    const testBonus = { ...bonusWithoutSlot };

    // Apply all gear lines (main/mainStats + subs + addition)
    mains.forEach((m) => {
      const statKey = String(m.stat);
      const value = Number(m.value ?? 0);
      if (!value) return;
      testBonus[statKey] = (testBonus[statKey] ?? 0) + value;
    });

    (gear.subs ?? []).forEach((s) => {
      const statKey = String(s.stat);
      const value = Number(s.value ?? 0);
      if (!value) return;
      testBonus[statKey] = (testBonus[statKey] ?? 0) + value;
    });

    if (gear.addition) {
      const statKey = String(gear.addition.stat);
      const value = Number(gear.addition.value ?? 0);
      if (value) testBonus[statKey] = (testBonus[statKey] ?? 0) + value;
    }

    const dmg = calcRotationAwareNormalDamage(
      stats,
      elementStats,
      testBonus,
      rotation
    );
    return ((dmg - base) / base) * 100;
  }, [baseline, elementStats, gear.subs, gear.addition, mains, stats, rotation]);

  const tuneStatPool = useMemo(
    () => (elementStats ? getTuneSystemStatPool(elementStats.selected) : []),
    [elementStats]
  );

  const tuneRows = useMemo(() => {
    if (!tuneDialogOpen || !baseline || baseline.base <= 0 || !elementStats) return [] as Array<{
      subIndex: number;
      currentStat: string;
      currentValue: number;
      expectedGainPct: number;
      bestCaseGainPct: number;
      outcomes: Array<{
        targetStat: StatHeatmapKey;
        expectedGainPct: number;
        bestCaseGainPct: number;
      }>;
    }>;
    if (hasUsedTune(gear)) return [];

    const rows: Array<{
      subIndex: number;
      currentStat: string;
      currentValue: number;
      expectedGainPct: number;
      bestCaseGainPct: number;
      outcomes: Array<{
        targetStat: StatHeatmapKey;
        expectedGainPct: number;
        bestCaseGainPct: number;
      }>;
    }> = [];

    const baseDamage = baseline.base;
    const baseBonusWithoutSlot = baseline.bonusWithoutSlot;
    const subStats = (gear.subs ?? []).map((line) => String(line.stat));

    (gear.subs ?? []).forEach((s, subIndex) => {
      const currentStat = String(s.stat);
      const currentValue = Number(s.value ?? 0);
      if (!Number.isFinite(currentValue) || currentValue === 0) return;

      const bonusWithoutLine = { ...baseBonusWithoutSlot };
      bonusWithoutLine[currentStat] =
        (bonusWithoutLine[currentStat] ?? 0) - currentValue;

      const outcomes: Array<{
        targetStat: StatHeatmapKey;
        expectedGainPct: number;
        bestCaseGainPct: number;
      }> = [];

      for (const targetStat of tuneStatPool) {
        if (targetStat === currentStat) continue;
        if (!isTuneTargetAllowedBySubRules(subStats, subIndex, targetStat)) {
          continue;
        }

        const range = STAT_HEATMAP_AFFIX_LIMITS[targetStat];
        if (!range) continue;

        const expectedValue = range.maxPerLine;
        const testBonus = { ...bonusWithoutLine };
        testBonus[targetStat] = (testBonus[targetStat] ?? 0) + expectedValue;

        const expectedDamage = calcRotationAwareNormalDamage(
          stats,
          elementStats,
          testBonus,
          rotation
        );

        const bestCaseBonus = { ...bonusWithoutLine };
        bestCaseBonus[targetStat] = (bestCaseBonus[targetStat] ?? 0) + range.maxPerLine;
        const bestCaseDamage = calcRotationAwareNormalDamage(
          stats,
          elementStats,
          bestCaseBonus,
          rotation
        );

        outcomes.push({
          targetStat,
          expectedGainPct: ((expectedDamage - baseDamage) / baseDamage) * 100,
          bestCaseGainPct: ((bestCaseDamage - baseDamage) / baseDamage) * 100,
        });
      }

      if (outcomes.length === 0) return;

      const expectedGainPct =
        outcomes.reduce((sum, x) => sum + x.expectedGainPct, 0) / outcomes.length;

      const bestCaseGainPct = Math.max(
        ...outcomes.map((outcome) => outcome.bestCaseGainPct)
      );

      rows.push({
        subIndex,
        currentStat,
        currentValue,
        expectedGainPct,
        bestCaseGainPct,
        outcomes: outcomes.sort((a, b) => b.expectedGainPct - a.expectedGainPct),
      });
    });

    return rows.sort((a, b) => b.expectedGainPct - a.expectedGainPct);
  }, [
    tuneDialogOpen,
    baseline,
    elementStats,
    gear.subs,
    rotation,
    stats,
    tuneStatPool,
  ]);

  return (
    <div ref={rootRef} className="h-full">
      <Card
        className={
          "group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-card/70 p-4 " +
          "transition-shadow hover:shadow-lg hover:shadow-black/20"
        }
      >
        {/* Accent */}
        <div
          className={
            "pointer-events-none absolute inset-x-0 top-0 h-1 " +
            (isEquipped
              ? "bg-gradient-to-r from-emerald-500/70 via-emerald-400/30 to-transparent"
              : "bg-gradient-to-r from-white/10 to-transparent")
          }
        />

        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-col">
              <div className="flex w-full items-center gap-2">
                <p className="min-w-0 truncate text-sm font-semibold">{gear.name}</p>
                {isEquipped && (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    {text.equipped}
                  </span>
                )}</div>
              <div className="flex w-full items-center gap-2">


                {impactEnabled &&
                  typeof impactPctTotal === "number" &&
                  Number.isFinite(impactPctTotal) &&
                  Math.abs(impactPctTotal) >= 0.01 && (
                    <span
                      className={
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                        (impactPctTotal >= 0
                          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                          : "border-red-400/25 bg-red-500/10 text-red-200")
                      }
                      title="Gear impact vs empty slot (keeping other equipped slots)"
                    >
                      {impactPctTotal >= 0 ? "+" : ""}
                      {impactPctTotal.toFixed(2)}%
                    </span>
                  )}
                {impactEnabled &&
                  typeof impactPctNoMain === "number" &&
                  Number.isFinite(impactPctNoMain) &&
                  Math.abs(impactPctNoMain) >= 0.01 && (
                    <span
                      className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200"
                      title="Gear impact excluding main stats (subs + bonus only)"
                    >
                      No-main {impactPctNoMain >= 0 ? "+" : ""}
                      {impactPctNoMain.toFixed(2)}%
                    </span>
                  )}
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/10 bg-background/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                {slotLabel}
              </span>
              {gear.rarity && (
                <span
                  className={
                    "rounded-md border px-2 py-0.5 text-[11px] font-medium " +
                    getRarityPillClass(gear.rarity)
                  }
                  title={gear.rarity}
                >
                  {gear.rarity}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="-mr-2 -mt-1 h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label={text.gearActions}
              >
                ⋮
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {isEquipped ? (
                <DropdownMenuItem onClick={unequip}>{text.unequip}</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={equip}>{text.equip}</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(gear)}>{text.edit}</DropdownMenuItem>
              <DropdownMenuItem className="text-red-400" onClick={() => onDelete(gear.id)}>
                {text.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-1 flex-col gap-3">
          {tuneStatPool.length > 0 && (gear.subs?.length ?? 0) > 0 && !hasUsedTune(gear) && (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-white/15 bg-background/40 px-2 text-[11px]"
                onClick={() => setTuneDialogOpen(true)}
              >
                {text.showTune}
              </Button>
            </div>
          )}

          {mains.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{text.main}</p>
                <p className="text-[11px] text-muted-foreground">{mains.length}</p>
              </div>
              <div className="space-y-1.5">
                {mains.map((m, i) => (
                  <StatLine
                    key={`${String(m.stat)}-${i}`}
                    stat={String(m.stat)}
                    value={m.value}
                    type="main"
                    elementStats={elementStats}
                    impactPct={impactPctByLineKey[`mains:${i}`]}
                  />
                ))}
              </div>
            </div>
          )}

          {gear.subs?.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{text.sub}</p>
                <p className="text-[11px] text-muted-foreground">{gear.subs.length}</p>
              </div>
              <div className="space-y-1.5">
                {gear.subs.map((s, i) => (
                  <StatLine
                    key={`${String(s.stat)}-${i}`}
                    stat={String(s.stat)}
                    value={s.value}
                    type="sub"
                    elementStats={elementStats}
                    impactPct={impactPctByLineKey[`subs:${i}`]}
                    isTuned={gear.tunedSubIndex === i}
                  />
                ))}
              </div>
            </div>
          )}

          {gear.addition && (
            <div className="mt-auto space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{text.bonus}</p>
              <StatLine
                stat={String(gear.addition.stat)}
                value={gear.addition.value}
                type="bonus"
                elementStats={elementStats}
                impactPct={impactPctByLineKey["addition:0"]}
              />
            </div>
          )}

        </div>
      </Card>

      <Dialog open={tuneDialogOpen} onOpenChange={setTuneDialogOpen}>
        <DialogContent className="max-h-[86dvh] w-[95vw] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {text.tuneTitle} • {gear.name}
            </DialogTitle>
          </DialogHeader>

          {hasUsedTune(gear) ? (
            <div className="rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
              {text.tunedLocked}
            </div>
          ) : tuneRows.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
              {text.noTuneLine}
            </div>
          ) : (
            <div className="space-y-2">
              {tuneRows.map((row) => (
                <div
                  key={`tune-dialog-subs-${row.subIndex}`}
                  className="rounded-md border border-white/10 bg-background/30 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      #{row.subIndex + 1} {getStatLabel(row.currentStat, elementStats)} +
                      {row.currentValue.toFixed(1)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-white/15",
                          row.expectedGainPct >= 0 ? "text-emerald-300" : "text-red-300"
                        )}
                      >
                        {text.expected} {row.expectedGainPct >= 0 ? "+" : ""}
                        {row.expectedGainPct.toFixed(2)}%
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-white/15",
                          row.bestCaseGainPct >= 0 ? "text-emerald-300" : "text-red-300"
                        )}
                      >
                        {text.bestCase} {row.bestCaseGainPct >= 0 ? "+" : ""}
                        {row.bestCaseGainPct.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-1.5 space-y-1">
                    <div className="text-[11px] text-muted-foreground">{text.availableStat}</div>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const maxPositive = Math.max(
                          0,
                          ...row.outcomes.map((outcome) => outcome.expectedGainPct)
                        );

                        const getImpactBadgeClass = (expectedGainPct: number) => {
                          if (expectedGainPct < 0) {
                            return "border-red-400/25 bg-red-500/10 text-red-200";
                          }

                          const ratio = maxPositive > 0 ? expectedGainPct / maxPositive : 0;
                          if (ratio >= 0.8) {
                            return "border-emerald-300/50 bg-emerald-500/35 text-emerald-100";
                          }
                          if (ratio >= 0.55) {
                            return "border-emerald-300/40 bg-emerald-500/25 text-emerald-100";
                          }
                          if (ratio >= 0.3) {
                            return "border-emerald-300/30 bg-emerald-500/18 text-emerald-200";
                          }
                          return "border-emerald-300/20 bg-emerald-500/10 text-emerald-200";
                        };

                        return row.outcomes.map((outcome) => (
                          <Badge
                            key={`tune-outcome-${row.subIndex}-${outcome.targetStat}`}
                            variant="outline"
                            className={cn(
                              "h-5 px-1.5 text-[10px]",
                              getImpactBadgeClass(outcome.expectedGainPct)
                            )}
                            title={`${outcome.expectedGainPct >= 0 ? "+" : ""}${outcome.expectedGainPct.toFixed(2)}%`}
                          >
                            {getStatLabel(outcome.targetStat, elementStats)}
                          </Badge>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =======================
   Stat Line
======================= */

function StatLine({
  stat,
  value,
  type,
  elementStats,
  impactPct,
  isTuned,
}: {
  stat: string;
  value: number;
  type: StatType;
  elementStats?: ElementStats;
  impactPct?: number;
  isTuned?: boolean;
}) {
  const key = String(stat);
  const showPct =
    typeof impactPct === "number" &&
    Number.isFinite(impactPct) &&
    Math.abs(impactPct) >= 0.01;
  const pctTone =
    !showPct
      ? "text-muted-foreground"
      : impactPct! > 0
        ? "text-emerald-400"
        : impactPct! < 0
          ? "text-red-400"
          : "text-muted-foreground";

  return (
    <div
      className={`
        flex items-center justify-between
        px-2.5 py-2
        rounded-md
        border
        text-xs
        ${STAT_BG[type]}
        ${isTuned ? "border-red-400/40 bg-red-500/15" : ""}
      `}
    >
      <span className="min-w-0 truncate text-muted-foreground">
        {getStatLabel(key, elementStats)}
      </span>
      <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
        +{Number(value).toFixed(1)}
        {showPct && (
          <span className={`ml-1 font-normal ${pctTone}`}>
            ({impactPct! >= 0 ? "+" : ""}
            {impactPct!.toFixed(2)}%)
          </span>
        )}
      </span>
    </div>
  );
}
