"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useGear } from "../../providers/GearContext";
import { GEAR_SLOTS } from "../../constants";
import GearDetailCard from "@/app/ui/gear/GearDetailCard";
import GearCombinedStats from "./GearCombinedStats";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";
import { useStats } from "@/app/hooks/useStats";
import { useElementStats } from "@/app/hooks/useElementStats";
import { useRotation } from "@/app/hooks/useRotation";
import { INITIAL_ELEMENT_STATS, INITIAL_STATS } from "@/app/constants";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { SKILLS } from "@/app/domain/skill/skills";
import { calculateSkillDamage } from "@/app/domain/skill/skillDamage";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import type { ElementStats, GearSlot, InputStats, Rotation } from "@/app/types";
import type { CustomGear } from "@/app/types";
import { useI18n } from "@/app/providers/I18nProvider";
import {
  STAT_HEATMAP_AFFIX_LIMITS,
  type StatHeatmapKey,
} from "@/app/constants";
import { getStatLabel } from "@/app/utils/statLabel";
import {
  getTuneSystemStatPool,
  hasUsedTune,
  isTuneTargetAllowedBySubRules,
} from "@/app/domain/gear/tuneAdvisor";

const LEFT_SLOT_ORDER: GearSlot[] = ["weapon_1", "weapon_2", "disc", "pendant"];
const RIGHT_SLOT_ORDER: GearSlot[] = ["head", "chest", "leg", "hand"];

function getGearStatLines(gear?: CustomGear | null): Array<{
  lineKey: string;
  statKey: string;
  value: number;
}> {
  if (!gear) return [];

  const lines: Array<{ lineKey: string; statKey: string; value: number }> = [];

  if (gear.main) {
    lines.push({
      lineKey: "main:0",
      statKey: String(gear.main.stat),
      value: Number(gear.main.value ?? 0),
    });
  }

  (gear.mains ?? []).forEach((m, i) => {
    lines.push({
      lineKey: `mains:${i}`,
      statKey: String(m.stat),
      value: Number(m.value ?? 0),
    });
  });

  (gear.subs ?? []).forEach((s, i) => {
    lines.push({
      lineKey: `subs:${i}`,
      statKey: String(s.stat),
      value: Number(s.value ?? 0),
    });
  });

  if (gear.addition) {
    lines.push({
      lineKey: "addition:0",
      statKey: String(gear.addition.stat),
      value: Number(gear.addition.value ?? 0),
    });
  }

  return lines.filter((x) => x.value !== 0);
}

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

export default function GearEquippedTab() {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      impactTitle: "📈 Tác động sát thương của trang bị",
      impactDesc: "Hiển thị mức tăng khi so với việc để trống ô đó (có tính rotation).",
      avgDamage: "Sát thương TB",
      equipped: "đang trang bị",
      empty: "Trống",
      noMain: "Không-main",
      worst: "Yếu nhất",
      withoutSlot: "Không có ô này",
      withCurrentGear: "Với trang bị hiện tại",
      deltaFromSlot: "Δ từ ô này",
      emptyOption: "Trống",
      tuneTitle: "🎲 Tune advisor",
      tuneDesc:
        "Gợi ý dòng phụ đáng roll nhất (chỉ tune 1 dòng, random trong hệ hiện tại).",
      tuneUnsupported:
        "Hệ Bellstrike chưa mở rule tune trong tool (đợi game cập nhật).",
      expected: "Kỳ vọng",
      bestCase: "Best-case",
      recommend: "Nên roll",
      targetPool: "Pool hệ",
      currentLine: "Dòng hiện tại",
      toStat: "Có thể ra",
      noSubLine: "Không có dòng phụ hợp lệ để tune (hoặc trang bị đã tune).",
      line: "Dòng",
      allLines: "Tất cả dòng có thể tune",
      gear: "Trang bị",
      current: "Hiện tại",
      availableStat: "Stat có thể ra",
    }
    : {
      impactTitle: "📈 Gear DMG Impact",
      impactDesc: "Shows gain vs leaving that slot empty (rotation-aware).",
      avgDamage: "Avg DMG",
      equipped: "equipped",
      empty: "Empty",
      noMain: "No-main",
      worst: "Worst",
      withoutSlot: "Without this slot",
      withCurrentGear: "With current gear",
      deltaFromSlot: "Δ from this slot",
      emptyOption: "Empty",
      tuneTitle: "🎲 Tune advisor",
      tuneDesc:
        "Suggests the best sub-line to reroll (single line tune, random within current system).",
      tuneUnsupported:
        "Bellstrike tune rules are not available yet in this tool (waiting game update).",
      expected: "Expected",
      bestCase: "Best-case",
      recommend: "Recommended",
      targetPool: "System pool",
      currentLine: "Current line",
      toStat: "Possible outcomes",
      noSubLine: "No valid sub-line available to tune (or gear already tuned).",
      line: "Line",
      allLines: "All tunable lines",
      gear: "Gear",
      current: "Current",
      availableStat: "Available stat",
    };

  const { customGears, equipped, setEquipped } = useGear();

  // Pull the same saved Stats/Element/Rotation that drive the rest of the app
  const { stats } = useStats(INITIAL_STATS);
  const { elementStats } = useElementStats(INITIAL_ELEMENT_STATS);
  const { selectedRotation } = useRotation();

  const bonus = useMemo(
    () => aggregateEquippedGearBonus(customGears, equipped),
    [customGears, equipped]
  );

  const fullDamage = useMemo(() => {
    return calcRotationAwareNormalDamage(
      stats,
      elementStats,
      bonus,
      selectedRotation
    );
  }, [stats, elementStats, bonus, selectedRotation]);

  const slotsWithImpact = useMemo(() => {
    const rows = GEAR_SLOTS.map(({ key, label }) => {
      const equippedId = equipped[key];
      const equippedGear = customGears.find((g) => g.id === equippedId);

      const equippedWithoutSlot: Partial<Record<GearSlot, string>> = {
        ...equipped,
      };
      delete equippedWithoutSlot[key];

      const bonusWithoutSlot = aggregateEquippedGearBonus(
        customGears,
        equippedWithoutSlot
      );
      const damageWithoutSlot = calcRotationAwareNormalDamage(
        stats,
        elementStats,
        bonusWithoutSlot,
        selectedRotation
      );

      const perStat = (() => {
        const impactPctByLineKey: Record<string, number> = {};
        let impactPctNoMain = 0;
        if (!equippedGear || damageWithoutSlot <= 0) {
          return { impactPctByLineKey, impactPctNoMain };
        }

        const lines = getGearStatLines(equippedGear);
        if (lines.length === 0) return { impactPctByLineKey, impactPctNoMain };

        for (const line of lines) {
          const testBonus = { ...bonusWithoutSlot };
          testBonus[line.statKey] = (testBonus[line.statKey] ?? 0) + line.value;
          const dmg = calcRotationAwareNormalDamage(
            stats,
            elementStats,
            testBonus,
            selectedRotation
          );
          impactPctByLineKey[line.lineKey] =
            ((dmg - damageWithoutSlot) / damageWithoutSlot) * 100;
        }

        // Gear-level impact excluding main stats: apply subs + addition together (skip main/mainStats)
        const noMainLines = lines.filter(
          (l) => !l.lineKey.startsWith("main:") && !l.lineKey.startsWith("mains:")
        );
        if (noMainLines.length > 0) {
          const testBonus = { ...bonusWithoutSlot };
          for (const l of noMainLines) {
            testBonus[l.statKey] = (testBonus[l.statKey] ?? 0) + l.value;
          }
          const dmgNoMain = calcRotationAwareNormalDamage(
            stats,
            elementStats,
            testBonus,
            selectedRotation
          );
          impactPctNoMain = ((dmgNoMain - damageWithoutSlot) / damageWithoutSlot) * 100;
        }

        return { impactPctByLineKey, impactPctNoMain };
      })();

      const diff = fullDamage - damageWithoutSlot;
      const percent =
        damageWithoutSlot <= 0 ? 0 : (diff / damageWithoutSlot) * 100;

      return {
        key,
        label,
        equippedId,
        equippedGear,
        damageWithoutSlot,
        diff,
        percent,
        perStat,
      };
    });

    const worst = rows
      .filter((r) => !!r.equippedGear)
      .sort((a, b) => a.percent - b.percent)[0]?.key;

    return { rows, worstKey: worst };
  }, [customGears, equipped, stats, elementStats, selectedRotation, fullDamage]);

  const rowsByKey = useMemo(() => {
    const map = new Map<GearSlot, (typeof slotsWithImpact.rows)[number]>();
    for (const row of slotsWithImpact.rows) {
      map.set(row.key, row);
    }
    return map;
  }, [slotsWithImpact]);

  const leftRows = useMemo(
    () => LEFT_SLOT_ORDER.map((k) => rowsByKey.get(k)).filter(Boolean),
    [rowsByKey]
  );

  const rightRows = useMemo(
    () => RIGHT_SLOT_ORDER.map((k) => rowsByKey.get(k)).filter(Boolean),
    [rowsByKey]
  );

  const tuneStatPool = useMemo(
    () => getTuneSystemStatPool(elementStats.selected),
    [elementStats.selected]
  );

  const tuneAdvice = useMemo(() => {
    const baseline = fullDamage;
    if (baseline <= 0 || tuneStatPool.length === 0) return [] as Array<{
      slot: GearSlot;
      slotLabel: string;
      gearName: string;
      subIndex: number;
      currentStat: string;
      currentValue: number;
      expectedGainPct: number;
      bestCaseGainPct: number;
      bestTargetStat: StatHeatmapKey;
      bestTargetValue: number;
      outcomes: Array<{ targetStat: StatHeatmapKey; expectedGainPct: number; bestCaseGainPct: number }>;
    }>;

    const calcWithBonus = (nextBonus: Record<string, number>) =>
      calcRotationAwareNormalDamage(stats, elementStats, nextBonus, selectedRotation);

    const candidates: Array<{
      slot: GearSlot;
      slotLabel: string;
      gearName: string;
      subIndex: number;
      currentStat: string;
      currentValue: number;
      expectedGainPct: number;
      bestCaseGainPct: number;
      bestTargetStat: StatHeatmapKey;
      bestTargetValue: number;
      outcomes: Array<{ targetStat: StatHeatmapKey; expectedGainPct: number; bestCaseGainPct: number }>;
    }> = [];

    for (const { key: slot, label: slotLabel } of GEAR_SLOTS) {
      const equippedId = equipped[slot];
      const equippedGear = customGears.find((g) => g.id === equippedId);
      if (!equippedGear || !equippedGear.subs || equippedGear.subs.length === 0) {
        continue;
      }
      if (hasUsedTune(equippedGear)) {
        continue;
      }

      for (let subIndex = 0; subIndex < equippedGear.subs.length; subIndex += 1) {
        const sub = equippedGear.subs[subIndex];
        const currentStat = String(sub.stat);
        const currentValue = Number(sub.value ?? 0);
        if (!Number.isFinite(currentValue) || currentValue === 0) continue;
        const subStats = equippedGear.subs.map((line) => String(line.stat));

        const bonusWithoutLine = { ...bonus };
        bonusWithoutLine[currentStat] = (bonusWithoutLine[currentStat] ?? 0) - currentValue;

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

          const expectedValue = (range.minPerLine + range.maxPerLine) / 2;
          const expectedBonus = { ...bonusWithoutLine };
          expectedBonus[targetStat] = (expectedBonus[targetStat] ?? 0) + expectedValue;
          const expectedDamage = calcWithBonus(expectedBonus);
          const expectedGainPct = ((expectedDamage - baseline) / baseline) * 100;

          const bestCaseBonus = { ...bonusWithoutLine };
          bestCaseBonus[targetStat] =
            (bestCaseBonus[targetStat] ?? 0) + range.maxPerLine;
          const bestCaseDamage = calcWithBonus(bestCaseBonus);
          const bestCaseGainPct = ((bestCaseDamage - baseline) / baseline) * 100;

          outcomes.push({ targetStat, expectedGainPct, bestCaseGainPct });
        }

        if (outcomes.length === 0) continue;

        const expectedGainPct =
          outcomes.reduce((sum, row) => sum + row.expectedGainPct, 0) / outcomes.length;

        const bestOutcome = outcomes.reduce((best, row) =>
          row.bestCaseGainPct > best.bestCaseGainPct ? row : best
        );

        candidates.push({
          slot,
          slotLabel,
          gearName: equippedGear.name,
          subIndex,
          currentStat,
          currentValue,
          expectedGainPct,
          bestCaseGainPct: bestOutcome.bestCaseGainPct,
          bestTargetStat: bestOutcome.targetStat,
          bestTargetValue: STAT_HEATMAP_AFFIX_LIMITS[bestOutcome.targetStat].maxPerLine,
          outcomes,
        });
      }
    }

    return candidates.sort((a, b) => b.expectedGainPct - a.expectedGainPct);
  }, [
    bonus,
    customGears,
    elementStats,
    equipped,
    fullDamage,
    selectedRotation,
    stats,
    tuneStatPool,
  ]);

  const groupedTuneAdvice = useMemo(() => {
    const groups = new Map<
      string,
      {
        slotLabel: string;
        gearName: string;
        items: Array<(typeof tuneAdvice)[number] & { rank: number }>;
      }
    >();

    tuneAdvice.forEach((item, index) => {
      const key = `${item.slot}-${item.gearName}`;
      const group = groups.get(key);
      if (!group) {
        groups.set(key, {
          slotLabel: item.slotLabel,
          gearName: item.gearName,
          items: [{ ...item, rank: index + 1 }],
        });
        return;
      }

      group.items.push({ ...item, rank: index + 1 });
    });

    return Array.from(groups.values());
  }, [tuneAdvice]);

  return (
    <div className="space-y-4" id="gear-combined-stats">
      {/* Combined result */}
      <GearCombinedStats bonus={bonus} />
      <Card className="border border-white/10 bg-card/60 p-3 shadow-lg sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold">{text.impactTitle}</div>
            <div className="text-xs text-muted-foreground">
              {text.impactDesc}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {text.avgDamage}: {Math.round(fullDamage).toLocaleString()}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {slotsWithImpact.rows.filter((r) => r.equippedGear).length}/
              {GEAR_SLOTS.length} {text.equipped}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:gap-4 xl:grid-cols-2">
        {[leftRows, rightRows].map((regionRows, regionIndex) => (
          <div key={regionIndex} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
            {regionRows.map((row) => {
              if (!row) return null;
              const available = customGears.filter((g) => g.slot === row.key);

              const pctText =
                row.equippedGear && row.damageWithoutSlot > 0
                  ? `${row.percent >= 0 ? "+" : ""}${row.percent.toFixed(2)}%`
                  : "0.00%";

              const isWorst =
                !!row.equippedGear && row.key === slotsWithImpact.worstKey;

              const diffTone =
                row.diff > 0
                  ? "text-emerald-600"
                  : row.diff < 0
                    ? "text-red-600"
                    : "text-muted-foreground";

              return (
                <Card
                  key={row.key}
                  className={cn(
                    "space-y-3 border bg-card/50 p-2.5 shadow-sm sm:p-3",
                    "border-white/10",
                    isWorst && "ring-1 ring-amber-400/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="text-sm font-semibold truncate">
                        {row.equippedGear?.name ?? text.empty}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={row.diff >= 0 ? "secondary" : "outline"}
                        className={cn(
                          row.diff > 0 && "bg-emerald-500/15 text-emerald-700",
                          row.diff < 0 && "bg-red-500/10 text-red-700"
                        )}
                      >
                        {pctText}
                      </Badge>
                      {typeof row.perStat.impactPctNoMain === "number" &&
                        Number.isFinite(row.perStat.impactPctNoMain) &&
                        Math.abs(row.perStat.impactPctNoMain) >= 0.01 && (
                          <Badge
                            variant="outline"
                            className="border-amber-400/30 bg-amber-500/10 text-amber-700"
                            title="Gear impact excluding main stats (subs + bonus only)"
                          >
                            {text.noMain} {row.perStat.impactPctNoMain >= 0 ? "+" : ""}
                            {row.perStat.impactPctNoMain.toFixed(2)}%
                          </Badge>
                        )}
                      {isWorst && (
                        <Badge className="bg-amber-500/15 text-amber-700" variant="outline">
                          {text.worst}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="text-muted-foreground">{text.withoutSlot}</div>
                    <div className="text-right">
                      {Math.round(row.damageWithoutSlot).toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">{text.withCurrentGear}</div>
                    <div className="text-right">
                      {Math.round(fullDamage).toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">{text.deltaFromSlot}</div>
                    <div className={cn("text-right font-medium", diffTone)}>
                      {row.diff > 0 ? "+" : ""}
                      {Math.round(row.diff).toLocaleString()}
                    </div>
                  </div>

                  <Separator className="bg-white/5" />

                  <select
                    value={row.equippedId || ""}
                    onChange={(e) =>
                      setEquipped((prev) => {
                        const next = { ...prev };
                        const v = e.target.value;
                        if (!v) {
                          delete next[row.key];
                        } else {
                          next[row.key] = v;
                        }
                        return next;
                      })
                    }
                    className={cn(
                      "w-full rounded-md border bg-background px-2 py-2 text-sm",
                      "border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15"
                    )}
                  >
                    <option value="">{text.emptyOption}</option>
                    {available.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                  {row.equippedGear ? (
                    <GearDetailCard
                      gear={row.equippedGear}
                      elementStats={elementStats}
                      impactPctByLineKey={row.perStat.impactPctByLineKey}
                    />
                  ) : (
                    <div className="h-36 rounded bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                      {row.label}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      <Card className="border border-white/10 bg-card/60 p-3 shadow-lg sm:p-4">
        <div className="space-y-3">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold">{text.tuneTitle}</div>
            <div className="text-xs text-muted-foreground">{text.tuneDesc}</div>
          </div>

          {tuneStatPool.length === 0 ? (
            <div className="rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              {text.tuneUnsupported}
            </div>
          ) : groupedTuneAdvice.length > 0 ? (
            <div className="space-y-3">
              <div className="text-[11px] text-muted-foreground">
                {text.targetPool}: {tuneStatPool.map((k) => getStatLabel(k, elementStats)).join(", ")}
              </div>

              <div className="space-y-2">
                {groupedTuneAdvice.map((group) => (
                  <div
                    key={`${group.slotLabel}-${group.gearName}`}
                    className="rounded-lg border border-white/10 bg-background/30 p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className="border-white/15">
                        {text.gear}: {group.slotLabel} - {group.gearName}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-700"
                      >
                        {text.expected} {group.items[0].expectedGainPct >= 0 ? "+" : ""}
                        {group.items[0].expectedGainPct.toFixed(2)}%
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                        <div
                          key={`${item.slot}-${item.gearName}-${item.subIndex}`}
                          className={cn(
                            "rounded-md border border-white/10 bg-card/40 px-2.5 py-2 text-xs",
                            item.rank === 1 && "border-emerald-400/30 bg-emerald-500/5"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-muted-foreground">
                                {text.line} #{item.subIndex + 1}
                              </span>
                              <span className="mx-1 text-muted-foreground">•</span>
                              <span
                                className="truncate"
                                title={`${getStatLabel(item.currentStat, elementStats)} +${item.currentValue.toFixed(1)}`}
                              >
                                {getStatLabel(item.currentStat, elementStats)} +
                                {item.currentValue.toFixed(1)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {item.rank === 1 && (
                                <Badge className="h-5 bg-emerald-500/15 px-1.5 text-[10px] text-emerald-700" variant="secondary">
                                  {text.recommend}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border-white/15",
                                  item.expectedGainPct >= 0
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                )}
                              >
                                {text.expected} {item.expectedGainPct >= 0 ? "+" : ""}
                                {item.expectedGainPct.toFixed(2)}%
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border-white/15",
                                  item.bestCaseGainPct >= 0
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                )}
                              >
                                {text.bestCase} {item.bestCaseGainPct >= 0 ? "+" : ""}
                                {item.bestCaseGainPct.toFixed(2)}%
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-1.5 space-y-1">
                            <div className="text-[11px] text-muted-foreground">
                              {text.availableStat}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const outcomesByImpact = [...item.outcomes].sort(
                                  (a, b) => b.expectedGainPct - a.expectedGainPct
                                );
                                const maxPositive = Math.max(
                                  0,
                                  ...outcomesByImpact.map((outcome) => outcome.expectedGainPct)
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

                                return outcomesByImpact.map((outcome) => (
                                  <Badge
                                    key={`${item.slot}-${item.subIndex}-${outcome.targetStat}`}
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
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-white/10 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
              {text.noSubLine}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
