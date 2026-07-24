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
  createRotationSkillRuntimeState,
  advanceRotationSkillRuntimeState,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
} from "@/app/domain/skill/skillDamage";
import { computeRotationBonuses, sumBonuses, computeExhaustedBonuses } from "@/app/domain/skill/modifierEngine";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { useI18n } from "@/app/providers/I18nProvider";
import type { LevelContext } from "@/app/domain/level/levelSettings";

interface Props {
  gear: CustomGear;
  oldGear?: CustomGear | null;
  elementStats: ElementStats;
  stats: InputStats;
  rotation?: Rotation;
  baseGearBonus: Record<string, number>;
  baseDamage?: number;
  levelContext?: Partial<LevelContext>;
}

function getGearMainTotals(gear?: CustomGear | null): Map<string, number> {
  const totals = new Map<string, number>();
  if (!gear) return totals;
  for (const a of gear.mains) {
    if (!a) continue;
    totals.set(String(a.stat), (totals.get(String(a.stat)) ?? 0) + (a.value ?? 0));
  }
  return totals;
}

function getGearSubTotals(gear?: CustomGear | null): Map<string, number> {
  const totals = new Map<string, number>();
  if (!gear) return totals;
  for (const a of [...gear.subs, gear.addition]) {
    if (!a) continue;
    totals.set(String(a.stat), (totals.get(String(a.stat)) ?? 0) + (a.value ?? 0));
  }
  return totals;
}

function computeRows(
  newTotals: Map<string, number>,
  oldTotals: Map<string, number>,
  elementStats: ElementStats,
) {
  const keys = new Set([...newTotals.keys(), ...oldTotals.keys()]);
  return Array.from(keys)
    .map((statKey) => {
      const newValue = newTotals.get(statKey) ?? 0;
      const oldValue = oldTotals.get(statKey) ?? 0;
      return { statKey, label: getStatLabel(statKey, elementStats), newValue, oldValue, diff: newValue - oldValue };
    })
    .filter((r) => r.newValue !== 0 || r.oldValue !== 0)
    .sort((a, b) => {
      const da = Math.abs(a.diff);
      const db = Math.abs(b.diff);
      if (da !== db) return db - da;
      return a.label.localeCompare(b.label);
    });
}

const isElementStatKey = (
  k: keyof ElementStats
): k is Exclude<keyof ElementStats, "selected" | "martialArtsId"> =>
  k !== "selected" && k !== "martialArtsId";

function StatRow({
  r, contribution, t, isTop,
}: {
  r: { statKey: string; label: string; newValue: number; oldValue: number; diff: number };
  contribution: { contributions: Map<string, number>; top: Set<string> };
  t: (key: string) => string;
  isTop: boolean;
}) {
  const diffTone =
    r.diff > 0 ? "text-emerald-600" : r.diff < 0 ? "text-red-600" : "text-muted-foreground";
  const impactPct = contribution.contributions.get(r.statKey);
  const impactLabel =
    impactPct === undefined ? null : `${impactPct >= 0 ? "+" : ""}${impactPct.toFixed(2)}% ${t("gearCard.hoverDmg")}`;

  return (
    <div className="contents">
      <div className={`min-w-0 truncate flex items-center gap-2 ${isTop ? "font-semibold" : ""}`} title={r.label}>
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
        {r.newValue > 0 ? "+" : ""}{r.newValue.toFixed(1)}
      </div>
      <div className="text-right tabular-nums text-muted-foreground">
        {r.oldValue > 0 ? "+" : ""}{r.oldValue.toFixed(1)}
      </div>
      <div className={`text-right tabular-nums font-semibold ${diffTone}`}>
        {r.diff > 0 ? "+" : ""}{r.diff.toFixed(1)}
      </div>
    </div>
  );
}

export default function GearHoverDetail({
  gear,
  oldGear,
  elementStats,
  stats,
  rotation,
  baseGearBonus,
  baseDamage,
  levelContext,
}: Props) {
  const { t } = useI18n();

  const sections = useMemo(() => {
    const newMains = getGearMainTotals(gear);
    const oldMains = getGearMainTotals(oldGear);
    const newSubs = getGearSubTotals(gear);
    const oldSubs = getGearSubTotals(oldGear);

    return {
      mainRows: computeRows(newMains, oldMains, elementStats),
      subRows: computeRows(newSubs, oldSubs, elementStats),
    };
  }, [gear, oldGear, elementStats]);

  const allRows = useMemo(() => [...sections.mainRows, ...sections.subRows], [sections]);

  const changedCount = allRows.reduce((acc, r) => acc + (r.diff !== 0 ? 1 : 0), 0);

  const contribution = useMemo(() => {
    const contributions = new Map<string, number>();

    const diffs = allRows.filter((r) => r.diff !== 0);
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
        const skillUseCountsInRotation = buildSkillUseCountsInRotation(rotation.skills);
        let totalNormal = 0;
        const runtimeState = createRotationSkillRuntimeState();
        const exhaustedBonuses = computeExhaustedBonuses(rotation, normalizedElementStats.martialArtsId);
        for (const rotSkill of rotation.skills) {
          const skill = SKILLS.find((s) => s.id === rotSkill.id);
          if (!skill) continue;
          const entryOpts = buildRotationSkillDamageOptions(
            rotSkill.id, rotSkill.params, rotation.activeInnerWays,
            skillUseCountsInRotation, rotSkill.count,
            rotation.activePassiveSkills, runtimeState.priorHitsBySkill,
            rotSkill.cancelled, rotSkill.exhausted, exhaustedBonuses,
          );
          entryOpts.rotationSkills = rotation.skills;
          const dmg = calculateSkillDamage(ctx, skill, entryOpts);
          totalNormal += dmg.total.normal.value * rotSkill.count;
          advanceRotationSkillRuntimeState(runtimeState, skill, entryOpts, rotSkill.count);
        }
        return totalNormal;
      }
      return calculateDamage(ctx).normal || 0;
    };

    const buildCtx = (gearBonus: Record<string, number>) => {
      const includedAbs = computeIncludedInStatsGearBonus(normalizedStats, normalizedElementStats, rotation, gearBonus);
      const effectiveGearBonus = sumBonuses(gearBonus, includedAbs);
      const passiveBonuses = computeRotationBonuses(normalizedStats, normalizedElementStats, effectiveGearBonus, rotation);
      return buildDamageContext(normalizedStats, normalizedElementStats, sumBonuses(effectiveGearBonus, passiveBonuses), undefined, levelContext);
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
  }, [allRows, stats, elementStats, rotation, baseGearBonus, baseDamage, levelContext]);

  const renderStatSection = (title: string, rows: typeof sections.mainRows) => {
    if (rows.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("gearCard.hoverStat")}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">{t("gearCard.hoverNewCol")}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">{t("gearCard.hoverOld")}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">Δ</div>
          {rows.map(r => (
            <StatRow key={r.statKey} r={r} contribution={contribution} t={t} isTop={contribution.top.has(r.statKey)} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[380px] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{gear.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge className="bg-emerald-500/15 text-emerald-700" variant="outline">
              {t("gearCard.hoverNew")}
            </Badge>
            <Badge variant="outline">Lv. {typeof gear.level === "number" && Number.isFinite(gear.level) ? gear.level : 91}</Badge>
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
            {t("gearCard.hoverEquipped")}: <span className="font-medium text-foreground">{oldGear.name}</span>
          </div>
        </>
      )}

      <Separator className="my-3" />

      <div className="space-y-3">
        {renderStatSection("Main Stats", sections.mainRows)}
        {renderStatSection("Sub Stats", sections.subRows)}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        {t("gearCard.hoverTopContrib")}
      </div>
    </div>
  );
}
