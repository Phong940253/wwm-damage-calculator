"use client";
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import FinalStatPanel from "../damage/FinalStatPanel";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { buildFinalStatSections } from "@/app/domain/damage/buildFinalStatSections";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { computeRelayedSubValue } from "@/app/domain/gear/tuneAdvisor";
import { MAIN_STAT_BY_LEVEL } from "@/app/domain/gear/gearConstants";
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

function buildRelayedGear(gear: CustomGear, slot: GearSlot): CustomGear {
  const lv96Mains = MAIN_STAT_BY_LEVEL[96]?.[slot];
  return {
    ...gear,
    mains: lv96Mains
      ? gear.mains.map(m => {
          const override = lv96Mains[m.stat];
          return override !== undefined ? { stat: m.stat, value: override } : m;
        })
      : gear.mains,
    subs: gear.subs.map(s => ({
      ...s,
      value: computeRelayedSubValue(String(s.stat) as Parameters<typeof computeRelayedSubValue>[0]),
    })),
    tunedSubIndex: undefined,
    tuneHistory: undefined,
  };
}

function mergeStatLines(
  originalGear: CustomGear,
  relayedGear: CustomGear,
): Array<{ stat: string; orig: number; relay: number; diff: number }> {
  const map = new Map<string, { orig: number; relay: number }>();
  const add = (gear: CustomGear, field: "orig" | "relay") => {
    for (const attr of [gear.main, ...gear.mains, ...gear.subs, gear.addition]) {
      if (!attr) continue;
      const key = String(attr.stat);
      if (!map.has(key)) map.set(key, { orig: 0, relay: 0 });
      map.get(key)![field] += typeof attr.value === "number" ? attr.value : 0;
    }
  };
  add(originalGear, "orig");
  add(relayedGear, "relay");
  return Array.from(map.entries())
    .map(([stat, { orig, relay }]) => ({ stat, orig, relay, diff: relay - orig }));
}

function GearRelayRow({
  label, originalGear, relayedGear, elementStats,
}: {
  label: string;
  originalGear: CustomGear;
  relayedGear: CustomGear;
  elementStats: ElementStats;
}) {
  const lines = useMemo(
    () => mergeStatLines(originalGear, relayedGear),
    [originalGear, relayedGear],
  );

  return (
    <div className="rounded-lg border border-white/10 p-3 space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">
        {label}: <span className="text-foreground font-semibold">{originalGear.name}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 text-xs">
        <div className="text-muted-foreground">Stat</div>
        <div className="text-right text-muted-foreground">Orig</div>
        <div className="text-right text-muted-foreground">Relay</div>
        <div className="text-right text-muted-foreground">Δ</div>
        {lines.map(l => (
          <div key={l.stat} className="contents">
            <div className="truncate">{getStatLabel(l.stat, elementStats)}</div>
            <div className="text-right tabular-nums">+{l.orig.toFixed(1)}</div>
            <div className="text-right tabular-nums font-medium text-emerald-600">+{l.relay.toFixed(1)}</div>
            <div className={`text-right tabular-nums font-semibold ${
              l.diff > 0 ? 'text-emerald-500' : l.diff < 0 ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {l.diff > 0 ? '+' : ''}{l.diff.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
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
      for (const attr of [relayedGear.main, ...relayedGear.mains, ...relayedGear.subs, relayedGear.addition]) {
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
