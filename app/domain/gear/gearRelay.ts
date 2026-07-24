import { computeRelayedSubValue } from "./tuneAdvisor";
import { MAIN_STAT_BY_LEVEL } from "./gearConstants";
import type { CustomGear, GearSlot } from "@/app/types";

function getEffectiveMains(gear: CustomGear) {
  return [...(gear.main ? [gear.main] : []), ...(gear.mains || [])];
}

export function buildRelayedGear(gear: CustomGear, slot: GearSlot): CustomGear {
  const lv96Mains = MAIN_STAT_BY_LEVEL[96]?.[slot];
  const effectiveMains = getEffectiveMains(gear);
  return {
    ...gear,
    main: undefined,
    mains: lv96Mains
      ? effectiveMains.map(m => {
          const override = lv96Mains[m.stat];
          return override !== undefined ? { stat: m.stat, value: override } : m;
        })
      : effectiveMains,
    subs: gear.subs.map(s => ({
      ...s,
      value: computeRelayedSubValue(String(s.stat) as Parameters<typeof computeRelayedSubValue>[0]),
    })),
    tunedSubIndex: undefined,
    tuneHistory: undefined,
  };
}

export function getAllAttributes(gear: CustomGear): Array<{ stat: string; value: number }> {
  const attrs: Array<{ stat: string; value: number }> = [];
  for (const item of [...gear.mains, ...gear.subs, gear.addition]) {
    if (!item) continue;
    const key = String(item.stat);
    const val = typeof item.value === "number" ? item.value : 0;
    if (val !== 0) {
      const existing = attrs.find(a => a.stat === key);
      if (existing) existing.value += val;
      else attrs.push({ stat: key, value: val });
    }
  }
  return attrs;
}

export function gearAttrsToMap(gear: CustomGear): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of [...gear.mains, ...gear.subs, gear.addition]) {
    if (!item) continue;
    const key = String(item.stat);
    map[key] = (map[key] || 0) + (typeof item.value === "number" ? item.value : 0);
  }
  return map;
}

export function sumAttrMaps(...maps: Record<string, number>[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const map of maps) {
    for (const [key, val] of Object.entries(map)) {
      result[key] = (result[key] || 0) + val;
    }
  }
  return result;
}
