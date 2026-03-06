"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CustomGear, ElementStats, InputStats, Rotation } from "@/app/types";
import { getStatLabel } from "@/app/utils/statLabel";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { SKILLS } from "@/app/domain/skill/skills";
import {
  calculateSkillDamage,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
} from "@/app/domain/skill/skillDamage";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { useI18n } from "@/app/providers/I18nProvider";

interface Props {
  gear: CustomGear;
  oldGear?: CustomGear | null;
  elementStats: ElementStats;
  stats: InputStats;
  rotation?: Rotation;
  baseGearBonus: Record<string, number>;
  baseDamage?: number;
}

function getGearStatTotals(gear?: CustomGear | null): Map<string, number> {
  const totals = new Map<string, number>();
  if (!gear) return totals;

  const attrs = [gear.main, ...gear.mains, ...gear.subs, gear.addition].filter(Boolean);
  for (const a of attrs) {
    const key = String(a!.stat);
    totals.set(key, (totals.get(key) ?? 0) + (a!.value ?? 0));
  }
  return totals;
}

const isElementStatKey = (
  k: keyof ElementStats
): k is Exclude<keyof ElementStats, "selected" | "martialArtsId"> =>
  k !== "selected" && k !== "martialArtsId";

export default function GearHoverDetail({
  gear,
  oldGear,
  elementStats,
  stats,
  rotation,
  baseGearBonus,
  baseDamage,
}: Props) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      newBadge: "Mới",
      newCol: "Mới",
      equipped: "Đang trang bị",
      stat: "Chỉ số",
      old: "Cũ",
      topContrib: "Top contributor được đánh dấu bằng chấm; mức ảnh hưởng được ước tính bằng cách áp riêng từng thay đổi chỉ số.",
      dmg: "sát thương",
    }
    : {
      newBadge: "New",
      newCol: "New",
      equipped: "Equipped",
      stat: "Stat",
      old: "Old",
      topContrib: "Top contributors are marked with a dot; impact is estimated by applying each stat delta alone.",
      dmg: "dmg",
    };

  const newTotals = getGearStatTotals(gear);
  const oldTotals = getGearStatTotals(oldGear);

  const allKeys = new Set<string>([...newTotals.keys(), ...oldTotals.keys()]);

  const rows = Array.from(allKeys)
    .map((statKey) => {
      const newValue = newTotals.get(statKey) ?? 0;
      const oldValue = oldTotals.get(statKey) ?? 0;
      const diff = newValue - oldValue;
      return {
        statKey,
        label: getStatLabel(statKey, elementStats),
        newValue,
        oldValue,
        diff,
      };
    })
    .filter((r) => r.newValue !== 0 || r.oldValue !== 0)
    .sort((a, b) => {
      const da = Math.abs(a.diff);
      const db = Math.abs(b.diff);
      if (da !== db) return db - da;
      return a.label.localeCompare(b.label);
    });

  const changedCount = rows.reduce((acc, r) => acc + (r.diff !== 0 ? 1 : 0), 0);

  const contribution = useMemo(() => {
    const contributions = new Map<string, number>();

    const diffs = rows.filter((r) => r.diff !== 0);
    if (diffs.length === 0) return { contributions, top: new Set<string>(), base: 0 };

    const normalizedStats: InputStats = Object.fromEntries(
      Object.keys(stats).map((k) => [
        k,
        { current: Number(stats[k].current || 0), increase: 0 },
      ])
    );

    const normalizedElementStats = {
      selected: elementStats.selected,
      martialArtsId: elementStats.martialArtsId,
      ...Object.fromEntries(
        (Object.keys(elementStats) as (keyof ElementStats)[])
          .filter(isElementStatKey)
          .map((k) => [k, { current: Number(elementStats[k].current || 0), increase: 0 }])
      ),
    } as ElementStats;

    const calcNormal = (ctx: ReturnType<typeof buildDamageContext>): number => {
      if (rotation && rotation.skills.length > 0) {
        const skillUseCountsInRotation = buildSkillUseCountsInRotation(
          rotation.skills,
        );

        let totalNormal = 0;
        for (const rotSkill of rotation.skills) {
          const skill = SKILLS.find((s) => s.id === rotSkill.id);
          if (!skill) continue;
          const dmg = calculateSkillDamage(
            ctx,
            skill,
            buildRotationSkillDamageOptions(
              rotSkill.id,
              rotSkill.params,
              rotation.activeInnerWays,
              skillUseCountsInRotation,
            ),
          );
          totalNormal += dmg.total.normal.value * rotSkill.count;
        }
        return totalNormal;
      }
      return calculateDamage(ctx).normal || 0;
    };

    const buildCtx = (gearBonus: Record<string, number>) => {
      const includedAbs = computeIncludedInStatsGearBonus(
        normalizedStats,
        normalizedElementStats,
        rotation,
        gearBonus,
      );
      const effectiveGearBonus = sumBonuses(gearBonus, includedAbs);

      const passiveBonuses = computeRotationBonuses(
        normalizedStats,
        normalizedElementStats,
        effectiveGearBonus,
        rotation
      );
      return buildDamageContext(
        normalizedStats,
        normalizedElementStats,
        sumBonuses(effectiveGearBonus, passiveBonuses)
      );
    };

    const base = baseDamage && baseDamage > 0 ? baseDamage : calcNormal(buildCtx(baseGearBonus));
    if (base <= 0) return { contributions, top: new Set<string>(), base };

    for (const r of diffs) {
      const gearBonus = { ...baseGearBonus };
      gearBonus[r.statKey] = (gearBonus[r.statKey] ?? 0) + r.diff;
      const dmg = calcNormal(buildCtx(gearBonus));
      const pct = ((dmg - base) / base) * 100;
      contributions.set(r.statKey, pct);
    }

    const ranked = Array.from(contributions.entries())
      .map(([statKey, pct]) => ({ statKey, pct }))
      .filter((x) => Math.abs(x.pct) > 0.01)
      .sort((a, b) => {
        const ap = a.pct > 0 ? 1 : 0;
        const bp = b.pct > 0 ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return Math.abs(b.pct) - Math.abs(a.pct);
      });

    const top = new Set<string>(ranked.slice(0, 3).map((x) => x.statKey));
    return { contributions, top, base };
  }, [rows, stats, elementStats, rotation, baseGearBonus, baseDamage]);

  return (
    <div className="w-[380px] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{gear.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge className="bg-emerald-500/15 text-emerald-700" variant="outline">
              {text.newBadge}
            </Badge>
            <Badge variant="secondary">{gear.slot}</Badge>
            {gear.rarity && <Badge variant="secondary">{gear.rarity}</Badge>}
            {oldGear && (
              <Badge variant="outline" className="text-muted-foreground">
                Δ {changedCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {oldGear && (
        <>
          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground">
            {text.equipped}: <span className="font-medium text-foreground">{oldGear.name}</span>
          </div>
        </>
      )}

      <Separator className="my-3" />

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{text.stat}</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">{text.newCol}</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">{text.old}</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">Δ</div>

        {rows.map((r) => {
          const diffTone =
            r.diff > 0
              ? "text-emerald-600"
              : r.diff < 0
                ? "text-red-600"
                : "text-muted-foreground";

          const impactPct = contribution.contributions.get(r.statKey);
          const isTop = contribution.top.has(r.statKey);
          const impactLabel =
            impactPct === undefined
              ? null
              : `${impactPct >= 0 ? "+" : ""}${impactPct.toFixed(2)}% ${text.dmg}`;

          return (
            <div key={r.statKey} className="contents">
              <div
                className={`min-w-0 truncate flex items-center gap-2 ${isTop ? "font-semibold" : ""}`}
                title={r.label}
              >
                {isTop ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {r.label}
                  </span>
                ) : (
                  r.label
                )}
                {impactLabel && (
                  <Badge
                    variant="outline"
                    className={
                      isTop
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                        : "text-muted-foreground"
                    }
                  >
                    {impactLabel}
                  </Badge>
                )}
              </div>
              <div className="text-right tabular-nums font-medium text-emerald-700">
                {r.newValue > 0 ? "+" : ""}
                {r.newValue.toFixed(1)}
              </div>
              <div className="text-right tabular-nums text-muted-foreground">
                {r.oldValue > 0 ? "+" : ""}
                {r.oldValue.toFixed(1)}
              </div>
              <div className={`text-right tabular-nums font-semibold ${diffTone}`}>
                {r.diff > 0 ? "+" : ""}
                {r.diff.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        {text.topContrib}
      </div>
    </div>
  );
}
