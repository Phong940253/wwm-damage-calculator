"use client";
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import FinalStatPanel from "../damage/FinalStatPanel";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { buildFinalStatSections } from "@/app/domain/damage/buildFinalStatSections";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { buildRelayedGear } from "@/app/domain/gear/gearRelay";
import { GEAR_SLOTS } from "@/app/constants";
import { getStatLabel } from "@/app/utils/statLabel";
import type { CustomGear, GearSlot, InputStats, ElementStats, Rotation } from "@/app/types";
import type { LevelContext } from "@/app/domain/level/levelSettings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: InputStats;
  elementStats: ElementStats;
  customGears: CustomGear[];
  equipped: Partial<Record<GearSlot, string | undefined>>;
  rotation?: Rotation;
  levelContext?: Partial<LevelContext>;
}

function getMergedAttrs(
  base: Record<string, number>,
  override: Record<string, number>,
): Array<{ stat: string; base: number; override: number; diff: number }> {
  const keys = new Set([...Object.keys(base), ...Object.keys(override)]);
  return Array.from(keys)
    .map(stat => {
      const b = base[stat] ?? 0;
      const o = override[stat] ?? 0;
      return { stat, base: b, override: o, diff: o - b };
    })
    .filter(l => l.base !== 0 || l.override !== 0);
}

function StatTable({
  lines, elementStats,
}: {
  lines: Array<{ stat: string; base: number; override: number; diff: number }>;
  elementStats: ElementStats;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 text-xs">
      <div className="text-muted-foreground">Stat</div>
      <div className="text-right text-muted-foreground">Base</div>
      <div className="text-right text-muted-foreground">Relay</div>
      <div className="text-right text-muted-foreground">Δ</div>
      {lines.map(l => (
        <div key={l.stat} className="contents">
          <div className="truncate">{getStatLabel(l.stat, elementStats)}</div>
          <div className="text-right tabular-nums">+{l.base.toFixed(1)}</div>
          <div className="text-right tabular-nums font-medium text-emerald-600">+{l.override.toFixed(1)}</div>
          <div className={`text-right tabular-nums font-semibold ${
            l.diff > 0 ? 'text-emerald-500' : l.diff < 0 ? 'text-red-400' : 'text-muted-foreground'
          }`}>
            {l.diff > 0 ? '+' : ''}{l.diff.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}

function getAttrMap(items: Array<{ stat: string | number; value: number } | null | undefined>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    if (!item) continue;
    const key = String(item.stat);
    map[key] = (map[key] || 0) + (typeof item.value === "number" ? item.value : 0);
  }
  return map;
}

function GearRelayRow({
  label, originalGear, relayedGear, elementStats,
}: {
  label: string;
  originalGear: CustomGear;
  relayedGear: CustomGear;
  elementStats: ElementStats;
}) {
  const sections = useMemo(() => {
    const origMains = getAttrMap(originalGear.mains);
    const relayMains = getAttrMap(relayedGear.mains);
    const origSubs = getAttrMap([...originalGear.subs, originalGear.addition]);
    const relaySubs = getAttrMap([...relayedGear.subs, relayedGear.addition]);
    return [
      { key: "mains", label: "Main Stats", lines: getMergedAttrs(origMains, relayMains) },
      { key: "subs", label: "Sub Stats", lines: getMergedAttrs(origSubs, relaySubs) },
    ];
  }, [originalGear, relayedGear]);

  return (
    <div className="rounded-lg border border-white/10 p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        {label}: <span className="text-foreground font-semibold">{originalGear.name}</span>
      </div>
      {sections.map(s => (
        s.lines.length > 0 && (
          <div key={s.key} className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {s.label}
            </div>
            <StatTable lines={s.lines} elementStats={elementStats} />
          </div>
        )
      ))}
    </div>
  );
}

export default function RelayedPreviewDialog({
  open, onOpenChange, stats, elementStats, customGears, equipped, rotation, levelContext,
}: Props) {
  const relayedSlots = useMemo(() => {
    const slots: Array<{
      slot: GearSlot;
      label: string;
      originalGear: CustomGear;
      relayedGear: CustomGear;
    }> = [];
    for (const { key: slot, label } of GEAR_SLOTS) {
      const gearId = equipped[slot];
      if (!gearId) continue;
      const gear = customGears.find(g => g.id === gearId);
      if (!gear) continue;
      slots.push({ slot, label, originalGear: gear, relayedGear: buildRelayedGear(gear, slot) });
    }
    return slots;
  }, [customGears, equipped]);

  const relayedBonus = useMemo(() => {
    const bonus: Record<string, number> = {};
    for (const { relayedGear } of relayedSlots) {
      for (const attr of [...relayedGear.mains, ...relayedGear.subs, relayedGear.addition]) {
        if (!attr) continue;
        const key = String(attr.stat);
        bonus[key] = (bonus[key] || 0) + (typeof attr.value === "number" ? attr.value : 0);
      }
    }
    return bonus;
  }, [relayedSlots]);

  const ctx = useMemo(() => {
    const includedAbs = computeIncludedInStatsGearBonus(stats, elementStats, rotation, relayedBonus);
    const effective = sumBonuses(relayedBonus, includedAbs);
    const rotBonuses = computeRotationBonuses(stats, elementStats, effective, rotation);
    const total = sumBonuses(effective, rotBonuses);
    return buildDamageContext(stats, elementStats, total, undefined, levelContext);
  }, [stats, elementStats, relayedBonus, rotation, levelContext]);

  const sections = useMemo(() => buildFinalStatSections(ctx), [ctx]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relayed Stats Preview (lv96)</DialogTitle>
        </DialogHeader>

        {relayedSlots.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Relayed Gear Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {relayedSlots.map(s => (
                <GearRelayRow
                  key={s.slot}
                  label={s.label}
                  originalGear={s.originalGear}
                  relayedGear={s.relayedGear}
                  elementStats={elementStats}
                />
              ))}
            </div>
            <Separator />
          </div>
        )}

        <FinalStatPanel sections={sections} ctx={ctx} />
      </DialogContent>
    </Dialog>
  );
}
