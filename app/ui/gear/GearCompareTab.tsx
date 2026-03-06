// app/gear/GearCompareTab.tsx
"use client";

import { useState } from "react";
import { useGear } from "../../providers/GearContext";
import { InputStats, ElementStats, Rotation } from "../../types";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";
import { SKILLS } from "@/app/domain/skill/skills";
import {
  calculateSkillDamage,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
} from "@/app/domain/skill/skillDamage";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { useI18n } from "@/app/providers/I18nProvider";

interface GearCompareTabProps {
  stats: InputStats;
  elementStats: ElementStats;
  rotation?: Rotation;
}

// helper
function buildEquippedWithOverride(
  equipped: Partial<Record<string, string>>,
  overrideGearId: string,
  overrideSlot: string
) {
  return {
    ...equipped,
    [overrideSlot]: overrideGearId, // 👈 replace slot
  };
}

export default function GearCompareTab({
  stats,
  elementStats,
  rotation,
}: GearCompareTabProps) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      title: "So sánh trang bị",
      swap: "Đổi chỗ",
      gearA: "Trang bị A",
      gearB: "Trang bị B",
      selectGear: "Chọn trang bị...",
      mainAttributes: "Thuộc tính chính",
      subAttributes: "Thuộc tính phụ",
      damageComparison: "So sánh sát thương",
      stat: "Chỉ số",
      damageType: "Loại sát thương",
      difference: "Chênh lệch",
      changePct: "% thay đổi",
      minDamage: "Sát thương thấp nhất",
      avgDamage: "Sát thương trung bình",
      affinityDamage: "Sát thương affinity",
      selectTwo: "Chọn hai trang bị để so sánh chỉ số",
    }
    : {
      title: "Gear Comparison",
      swap: "Swap",
      gearA: "Gear A",
      gearB: "Gear B",
      selectGear: "Select a gear...",
      mainAttributes: "Main Attributes",
      subAttributes: "Sub Attributes",
      damageComparison: "Damage Comparison",
      stat: "Stat",
      damageType: "Damage Type",
      difference: "Difference",
      changePct: "Change %",
      minDamage: "Min Damage",
      avgDamage: "Average Damage",
      affinityDamage: "Affinity Damage",
      selectTwo: "Select two gears to compare their stats",
    };

  const { customGears, equipped } = useGear();

  const [gearA, setGearA] = useState<string>("");
  const [gearB, setGearB] = useState<string>("");

  const selectedGearA = customGears.find((g) => g.id === gearA);
  const selectedGearB = customGears.find((g) => g.id === gearB);

  const handleSwap = () => {
    const temp = gearA;
    setGearA(gearB);
    setGearB(temp);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">{text.title}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwap}
          disabled={!gearA || !gearB}
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          {text.swap}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-lg border p-3 sm:p-4">
          <label className="block text-sm font-medium mb-2 text-emerald-500">
            {text.gearA}
          </label>
          <select
            className="w-full border rounded px-3 py-2 bg-background"
            value={gearA}
            onChange={(e) => setGearA(e.target.value)}
          >
            <option value="">{text.selectGear}</option>
            {customGears.map((gear) => (
              <option key={gear.id} value={gear.id}>
                {gear.name} ({gear.slot})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border p-3 sm:p-4">
          <label className="block text-sm font-medium mb-2 text-blue-500">
            {text.gearB}
          </label>
          <select
            className="w-full border rounded px-3 py-2 bg-background"
            value={gearB}
            onChange={(e) => setGearB(e.target.value)}
          >
            <option value="">{text.selectGear}</option>
            {customGears.map((gear) => (
              <option key={gear.id} value={gear.id}>
                {gear.name} ({gear.slot})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedGearA && selectedGearB ? (
        <div className="space-y-4">
          {(selectedGearA.mains.length > 0 ||
            selectedGearB.mains.length > 0) && (
              <div className="overflow-hidden rounded-lg border">
                <div className="bg-muted/50 px-4 py-2">
                  <h3 className="font-medium">{text.mainAttributes}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm">{text.stat}</th>
                        <th className="px-4 py-2 text-right text-sm text-emerald-500">
                          Gear A
                        </th>
                        <th className="px-4 py-2 text-right text-sm text-blue-500">
                          Gear B
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Array.from(
                        new Set([
                          ...selectedGearA.mains.map((m) => m.stat),
                          ...selectedGearB.mains.map((m) => m.stat),
                        ])
                      ).map((stat) => {
                        const valueA = selectedGearA.mains.find(
                          (m) => m.stat === stat
                        )?.value;
                        const valueB = selectedGearB.mains.find(
                          (m) => m.stat === stat
                        )?.value;
                        return (
                          <tr key={stat}>
                            <td className="px-4 py-2 text-sm font-medium">
                              {stat}
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              {valueA !== undefined ? valueA : "-"}
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              {valueB !== undefined ? valueB : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {(selectedGearA.subs.length > 0 || selectedGearB.subs.length > 0) && (
            <div className="overflow-hidden rounded-lg border">
              <div className="bg-muted/50 px-4 py-2">
                <h3 className="font-medium">{text.subAttributes}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">{text.stat}</th>
                      <th className="px-4 py-2 text-right text-sm text-emerald-500">
                        Gear A
                      </th>
                      <th className="px-4 py-2 text-right text-sm text-blue-500">
                        Gear B
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.from(
                      new Set([
                        ...selectedGearA.subs.map((s) => s.stat),
                        ...selectedGearB.subs.map((s) => s.stat),
                      ])
                    ).map((stat) => {
                      const valueA = selectedGearA.subs.find(
                        (s) => s.stat === stat
                      )?.value;
                      const valueB = selectedGearB.subs.find(
                        (s) => s.stat === stat
                      )?.value;
                      return (
                        <tr key={stat}>
                          <td className="px-4 py-2 text-sm font-medium">
                            {stat}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {valueA !== undefined ? valueA : "-"}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {valueB !== undefined ? valueB : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Damage Comparison */}
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-muted/50 px-4 py-2">
              <h3 className="font-medium">{text.damageComparison}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">{text.damageType}</th>
                    <th className="px-4 py-2 text-right text-sm text-emerald-500">
                      Gear A
                    </th>
                    <th className="px-4 py-2 text-right text-sm text-blue-500">
                      Gear B
                    </th>
                    <th className="px-4 py-2 text-right text-sm">{text.difference}</th>
                    <th className="px-4 py-2 text-right text-sm">{text.changePct}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(() => {
                    // Build equipped sets
                    const equippedA = buildEquippedWithOverride(
                      equipped,
                      selectedGearA.id,
                      selectedGearA.slot
                    );

                    const equippedB = buildEquippedWithOverride(
                      equipped,
                      selectedGearB.id,
                      selectedGearB.slot
                    );

                    // Aggregate full gear bonus
                    const bonusA = aggregateEquippedGearBonus(
                      customGears,
                      equippedA
                    );
                    const bonusB = aggregateEquippedGearBonus(
                      customGears,
                      equippedB
                    );

                    const buildCtx = (gearBonus: Record<string, number>) => {
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

                      return buildDamageContext(
                        stats,
                        elementStats,
                        sumBonuses(effectiveGearBonus, rotationBonuses)
                      );
                    };

                    // Build contexts
                    const ctxA = buildCtx(bonusA);
                    const ctxB = buildCtx(bonusB);

                    // Calculate damage - rotation-aware
                    let damageA: ReturnType<typeof calculateDamage> | { min: number; normal: number; affinity: number };
                    let damageB: ReturnType<typeof calculateDamage> | { min: number; normal: number; affinity: number };

                    if (rotation && rotation.skills.length > 0) {
                      const skillUseCountsInRotation =
                        buildSkillUseCountsInRotation(rotation.skills);

                      const buildOpts = (
                        skillId: string,
                        params: Record<string, number> | undefined,
                      ) =>
                        buildRotationSkillDamageOptions(
                          skillId,
                          params,
                          rotation.activeInnerWays,
                          skillUseCountsInRotation,
                        );

                      // Rotation-based damage
                      let totalMinA = 0,
                        totalNormalA = 0,
                        totalAffinityA = 0;
                      let totalMinB = 0,
                        totalNormalB = 0,
                        totalAffinityB = 0;

                      for (const rotSkill of rotation.skills) {
                        const skill = SKILLS.find((s) => s.id === rotSkill.id);
                        if (!skill) continue;

                        const skillDmgA = calculateSkillDamage(
                          ctxA,
                          skill,
                          buildOpts(rotSkill.id, rotSkill.params),
                        );
                        totalMinA +=
                          skillDmgA.total.min.value * rotSkill.count;
                        totalNormalA +=
                          skillDmgA.total.normal.value * rotSkill.count;
                        totalAffinityA +=
                          skillDmgA.total.affinity.value * rotSkill.count;

                        const skillDmgB = calculateSkillDamage(
                          ctxB,
                          skill,
                          buildOpts(rotSkill.id, rotSkill.params),
                        );
                        totalMinB +=
                          skillDmgB.total.min.value * rotSkill.count;
                        totalNormalB +=
                          skillDmgB.total.normal.value * rotSkill.count;
                        totalAffinityB +=
                          skillDmgB.total.affinity.value * rotSkill.count;
                      }

                      damageA = {
                        min: totalMinA,
                        normal: totalNormalA,
                        affinity: totalAffinityA,
                      };
                      damageB = {
                        min: totalMinB,
                        normal: totalNormalB,
                        affinity: totalAffinityB,
                      };
                    } else {
                      // Single-hit damage
                      damageA = calculateDamage(ctxA);
                      damageB = calculateDamage(ctxB);
                    }

                    const rows = [
                      {
                        label: text.minDamage,
                        valueA: damageA.min,
                        valueB: damageB.min,
                      },
                      {
                        label: text.avgDamage,
                        valueA: damageA.normal,
                        valueB: damageB.normal,
                      },
                      {
                        label: text.affinityDamage,
                        valueA: damageA.affinity,
                        valueB: damageB.affinity,
                      },
                    ];

                    return rows.map((row) => {
                      const diff = row.valueB - row.valueA;
                      const percent =
                        row.valueA === 0 ? 0 : (diff / row.valueA) * 100;
                      const isPositive = diff > 0;
                      const isNegative = diff < 0;

                      return (
                        <tr key={row.label}>
                          <td className="px-4 py-2 text-sm font-medium">
                            {row.label}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {row.valueA.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {row.valueB.toLocaleString()}
                          </td>
                          <td
                            className={`px-4 py-2 text-right text-sm font-medium ${isPositive
                              ? "text-green-500"
                              : isNegative
                                ? "text-red-500"
                                : ""
                              }`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {isPositive && <TrendingUp className="w-4 h-4" />}
                              {isNegative && <TrendingDown className="w-4 h-4" />}
                              {diff > 0 ? "+" : ""}
                              {diff.toLocaleString()}
                            </div>
                          </td>
                          <td
                            className={`px-4 py-2 text-right text-sm font-medium ${isPositive
                              ? "text-green-500"
                              : isNegative
                                ? "text-red-500"
                                : ""
                              }`}
                          >
                            {percent > 0 ? "+" : ""}
                            {percent.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-6 text-center text-muted-foreground sm:p-8">
          {text.selectTwo}
        </div>
      )}
    </div>
  );
}
