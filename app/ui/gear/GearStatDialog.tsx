"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FinalStatPanel from "../damage/FinalStatPanel";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { buildFinalStatSections } from "@/app/domain/damage/buildFinalStatSections";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";
import { buildRelayedGear } from "@/app/domain/gear/gearRelay";
import type { CustomGear, GearSlot, InputStats, ElementStats, Rotation } from "@/app/types";
import type { LevelContext } from "@/app/domain/level/levelSettings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: InputStats;
  elementStats: ElementStats;
  selection: Partial<Record<GearSlot, CustomGear>>;
  equipped?: Partial<Record<GearSlot, string | undefined>>;
  customGears?: CustomGear[];
  rotation?: Rotation;
  levelContext?: Partial<LevelContext>;
  relayEnabled?: boolean;
}

function modifyGearStats(
  bonus: Record<string, number>,
  gear: CustomGear,
  sign: 1 | -1,
): void {
  for (const a of [...gear.mains, ...gear.subs, gear.addition]) {
    if (!a) continue;
    const key = String(a.stat);
    const val = typeof a.value === "number" ? a.value : 0;
    bonus[key] = (bonus[key] || 0) + sign * val;
  }
}

function buildGearBonusFromSelection(
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  selection: Partial<Record<GearSlot, CustomGear>>,
  relayEnabled?: boolean,
): Record<string, number> {
  const bonus = aggregateEquippedGearBonus(customGears, equipped);

  for (const [slotStr, selectedGear] of Object.entries(selection)) {
    const slot = slotStr as GearSlot;
    if (!selectedGear) continue;

    const equipGear = relayEnabled ? buildRelayedGear(selectedGear, slot) : selectedGear;

    const equippedId = equipped[slot];
    if (equippedId) {
      const equippedGear = customGears.find((g) => g.id === equippedId);
      if (equippedGear) {
        modifyGearStats(bonus, equippedGear, -1);
      }
    }
    modifyGearStats(bonus, equipGear, 1);
  }

  return bonus;
}

export default function GearStatDialog({
  open,
  onOpenChange,
  stats,
  elementStats,
  selection,
  equipped = {},
  customGears = [],
  rotation,
  levelContext,
  relayEnabled = false,
}: Props) {
  const gearBonus = useMemo(
    () => buildGearBonusFromSelection(customGears, equipped, selection, relayEnabled),
    [customGears, equipped, selection, relayEnabled],
  );

  const ctx = useMemo(() => {
    const includedAbs = computeIncludedInStatsGearBonus(
      stats, elementStats, rotation, gearBonus,
    );
    const effective = sumBonuses(gearBonus, includedAbs);
    const rotBonuses = computeRotationBonuses(
      stats, elementStats, effective, rotation,
    );
    const total = sumBonuses(effective, rotBonuses);
    return buildDamageContext(stats, elementStats, total, undefined, levelContext);
  }, [stats, elementStats, gearBonus, rotation, levelContext]);

  const sections = useMemo(() => buildFinalStatSections(ctx), [ctx]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Final Stats</DialogTitle>
        </DialogHeader>
        <FinalStatPanel sections={sections} ctx={ctx} />
      </DialogContent>
    </Dialog>
  );
}
