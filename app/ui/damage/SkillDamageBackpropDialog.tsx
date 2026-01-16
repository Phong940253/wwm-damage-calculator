"use client";

import React, { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skill } from "@/app/domain/skill/types";
import { DamageContext } from "@/app/domain/damage/damageContext";
import { createSkillContext } from "@/app/domain/skill/skillContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { explainCalcExpectedNormal } from "@/app/domain/damage/damageFormula";
import { Separator } from "@/components/ui/separator";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getStatLabel } from "@/app/utils/statLabel";

function fmt(n: number, digits = 4) {
    if (!Number.isFinite(n)) return "NaN";
    const p = 10 ** digits;
    const rounded = Math.round(n * p) / p;
    return String(rounded);
}

function Num({ n }: { n: number }) {
    return (
        <span className="font-mono text-xs text-zinc-100 tabular-nums">{fmt(n)}</span>
    );
}

function statTone(statKey: string): string {
    const k = statKey.toLowerCase();
    if (k.includes("rate")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    if (k.includes("penetration")) return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";
    if (k.includes("dmgbonus") || k.includes("damageboost"))
        return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    if (k.includes("multiplier")) return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    if (k.includes("attack")) return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
    if (k.includes("flat")) return "border-zinc-500/30 bg-zinc-500/10 text-zinc-200";
    return "border-white/15 bg-white/5 text-zinc-200";
}

function StatValue({
    statKey,
    value,
    unit,
}: {
    statKey: string;
    value: number;
    unit?: "percent";
}) {
    const label = getStatLabel(statKey);
    const display = unit === "percent" ? `${fmt(value, 2)}%` : fmt(value, 2);
    const tone = statTone(statKey);

    return (
        <HoverCard openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
                <span
                    className={`
                        inline-flex items-center
                        rounded-md border px-1.5 py-0.5
                        font-mono text-xs tabular-nums
                        cursor-help select-none
                        ${tone}
                    `}
                    aria-label={label}
                >
                    {display}
                </span>
            </HoverCardTrigger>

            <HoverCardContent align="start" side="top" className="w-72">
                <div className="space-y-1">
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs text-muted-foreground font-mono break-all">
                        {statKey}
                    </div>
                    <div className="text-xs">
                        value: <span className="font-mono">{display}</span>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}

function DerivedValue({
    name,
    value,
    explain,
}: {
    name: string;
    value: number;
    explain: string;
}) {
    return (
        <HoverCard openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
                <span
                    className="
                        inline-flex items-center
                        rounded-md border border-white/15 bg-white/5
                        px-1.5 py-0.5
                        font-mono text-xs tabular-nums text-zinc-100
                        cursor-help select-none
                    "
                    aria-label={name}
                >
                    {fmt(value, 2)}
                </span>
            </HoverCardTrigger>

            <HoverCardContent align="start" side="top" className="w-72">
                <div className="space-y-1">
                    <div className="text-sm font-semibold">{name}</div>
                    <div className="text-xs text-muted-foreground font-mono break-words">
                        {explain}
                    </div>
                    <div className="text-xs">
                        value: <span className="font-mono">{fmt(value, 4)}</span>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}

function Name({ children }: { children: React.ReactNode }) {
    return (
        <span className="font-mono text-xs text-zinc-300 whitespace-normal break-words min-w-0">
            {children}
        </span>
    );
}

function Op({ children, tone }: { children: React.ReactNode; tone: "add" | "mul" | "div" | "eq" | "paren" | "cmp" }) {
    const cls =
        tone === "add"
            ? "text-emerald-300"
            : tone === "mul"
                ? "text-sky-300"
                : tone === "div"
                    ? "text-fuchsia-300"
                    : tone === "eq"
                        ? "text-zinc-400"
                        : tone === "cmp"
                            ? "text-amber-300"
                            : "text-zinc-500";

    return (
        <span className={`font-mono text-xs ${cls} px-0.5`}>{children}</span>
    );
}

function ExprRow({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 leading-5">
            {children}
        </div>
    );
}

function Legend() {
    return (
        <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-zinc-300">Operator legend</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-mono">
                    <span className="text-emerald-300">+</span> add
                </span>
                <span className="font-mono">
                    <span className="text-sky-300">×</span> multiply
                </span>
                <span className="font-mono">
                    <span className="text-fuchsia-300">÷</span> divide
                </span>
                <span className="font-mono">
                    <span className="text-zinc-400">=</span> assign/result
                </span>
                <span className="font-mono">
                    <span className="text-amber-300">max(·)</span> take max
                </span>
                <span className="font-mono">
                    <span className="text-zinc-300">clamp01(x)</span> clamp to [0,1]
                </span>
            </div>
        </div>
    );
}

export function SkillDamageBackpropDialog({
    open,
    onOpenChange,
    skill,
    ctx,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    skill: Skill;
    ctx: DamageContext;
}) {
    const hitExplains = useMemo(() => {
        const damageSkillType = skill.damageSkillType ?? "normal";

        return skill.hits.map((hit, hitIndex) => {
            const hitCtx = createSkillContext(ctx, {
                physicalMultiplier: hit.physicalMultiplier,
                elementMultiplier: hit.elementMultiplier,
                flatPhysical: hit.flatPhysical,
                flatAttribute: hit.flatAttribute,
                damageSkillType,
            });

            const damage = calculateDamage(hitCtx);
            const steps = explainCalcExpectedNormal(hitCtx.get, damage.affinity);

            return {
                hitIndex,
                hitCount: hit.hits,
                hit,
                damage,
                steps,
            };
        });
    }, [ctx, skill]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="
          fixed right-0 top-0 left-auto
          h-[100dvh] w-full sm:w-[560px]
          translate-x-0 translate-y-0
          rounded-none sm:rounded-none
          border-l border-white/10
          p-0
          overflow-hidden
          data-[state=open]:slide-in-from-right-1/2
          data-[state=closed]:slide-out-to-right-1/2
        "
            >
                <div className="flex h-full min-h-0 flex-col">
                    <div className="p-5 pb-3">
                        <DialogHeader className="text-left">
                            <DialogTitle>{skill.name}</DialogTitle>
                            <DialogDescription>
                                Damage backprop (from [app/domain/damage/damageFormula.ts]) — shown as
                                readable arithmetic (no KaTeX)
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
                        <Legend />

                        {hitExplains.map(({ hitIndex, hitCount, hit, damage, steps }) => {
                            const physAtkMult = steps.cache.physAtkMult / 100;
                            const elemMult = steps.cache.elementMult / 100;
                            const physPenFactor = 1 + steps.cache.physPenetration / 200;
                            const physBonusFactor = 1 + steps.cache.physDmgBonus / 100;
                            const elemFactor =
                                1 + steps.cache.attrPenetration / 200 + steps.cache.attrDmgBonus / 100;
                            const dmgBoost = 1 + steps.cache.dmgBoost / 100;
                            const maxOtherAttr = Math.max(steps.cache.minOtherAttr, steps.cache.maxOtherAttr);
                            const affinityBonus = 1 + steps.cache.affinityDmgBonus / 100;
                            const criticalBonus = 1 + steps.cache.critDmgBonus / 100;
                            const cd = steps.CD;

                            // Substituted helper numbers (to avoid long variable-only lines)
                            const minInnerPhys =
                                steps.cache.minPhysAtk * physPenFactor * physBonusFactor +
                                steps.cache.minOtherAttr;
                            const maxInnerPhys =
                                steps.cache.maxPhysAtk * physPenFactor * physBonusFactor + maxOtherAttr;

                            const minInner =
                                minInnerPhys * physAtkMult +
                                steps.cache.flatDmg +
                                steps.cache.minYourAttr * elemMult * elemFactor;
                            const maxInner =
                                maxInnerPhys * physAtkMult +
                                steps.cache.flatDmg +
                                steps.cache.maxYourAttr * elemMult * elemFactor;

                            const minDamageApprox = minInner * 1.02 * dmgBoost;
                            const critDamageApprox = maxInner * criticalBonus * dmgBoost;
                            const affDamageApprox = maxInner * affinityBonus * dmgBoost;

                            return (
                                <div
                                    key={hitIndex}
                                    className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3"
                                >
                                    <div className="flex items-baseline justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold">Hit group {hitIndex + 1}</div>
                                            <div className="text-xs text-muted-foreground">
                                                repeats: {hitCount} · physMult: {fmt(hit.physicalMultiplier)} ·
                                                elemMult: {fmt(hit.elementMultiplier)}
                                            </div>
                                        </div>

                                        <div className="text-right text-xs text-muted-foreground">
                                            <div>
                                                min <span className="text-zinc-100">{fmt(damage.min, 1)}</span>
                                            </div>
                                            <div>
                                                avg <span className="text-zinc-100">{fmt(damage.normal, 1)}</span>
                                            </div>
                                            <div>
                                                crit <span className="text-zinc-100">{fmt(damage.critical, 1)}</span>
                                            </div>
                                            <div>
                                                aff <span className="text-zinc-100">{fmt(damage.affinity, 1)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-white/10" />

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-zinc-300">
                                            Base stats (hover for stat name)
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            <StatValue statKey="MinPhysicalAttack" value={steps.cache.minPhysAtk} />
                                            <StatValue statKey="MaxPhysicalAttack" value={steps.cache.maxPhysAtk} />
                                            <StatValue
                                                statKey="PhysicalPenetration"
                                                value={steps.cache.physPenetration}
                                            />
                                            <StatValue
                                                statKey="PhysicalDMGBonus"
                                                value={steps.cache.physDmgBonus}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="MINAttributeAttackOfOtherType"
                                                value={steps.cache.minOtherAttr}
                                            />
                                            <StatValue
                                                statKey="MAXAttributeAttackOfOtherType"
                                                value={steps.cache.maxOtherAttr}
                                            />
                                            <StatValue
                                                statKey="PhysicalAttackMultiplier"
                                                value={steps.cache.physAtkMult}
                                                unit="percent"
                                            />
                                            <StatValue statKey="FlatDamage" value={steps.cache.flatDmg} />
                                            <StatValue
                                                statKey="MINAttributeAttackOfYOURType"
                                                value={steps.cache.minYourAttr}
                                            />
                                            <StatValue
                                                statKey="MAXAttributeAttackOfYOURType"
                                                value={steps.cache.maxYourAttr}
                                            />
                                            <StatValue
                                                statKey="MainElementMultiplier"
                                                value={steps.cache.elementMult}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="AttributeAttackPenetrationOfYOURType"
                                                value={steps.cache.attrPenetration}
                                            />
                                            <StatValue
                                                statKey="AttributeAttackDMGBonusOfYOURType"
                                                value={steps.cache.attrDmgBonus}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="CriticalDMGBonus"
                                                value={steps.cache.critDmgBonus}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="AffinityDMGBonus"
                                                value={steps.cache.affinityDmgBonus}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="DamageBoost"
                                                value={steps.cache.dmgBoost}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="PrecisionRate"
                                                value={steps.P_raw * 100}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="CriticalRate"
                                                value={steps.C_raw * 100}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="AffinityRate"
                                                value={steps.A_raw * 100}
                                                unit="percent"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-zinc-300">Substituted (numbers)</div>

                                        <ExprRow>
                                            <Name>Base</Name>
                                            <Op tone="eq">=</Op>
                                            <Op tone="paren">(</Op>
                                            <Op tone="paren">(</Op>
                                            <DerivedValue
                                                name="avgPhysAtk"
                                                value={steps.avgPhysAtk}
                                                explain="avgPhysAtk = (MinPhysicalAttack + MaxPhysicalAttack) / 2"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="physModifier"
                                                value={steps.physModifier}
                                                explain="physModifier = 1 + PhysicalPenetration / 200"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="physBonus"
                                                value={steps.physBonus}
                                                explain="physBonus = 1 + PhysicalDMGBonus / 100"
                                            />
                                            <Op tone="add">+</Op>
                                            <DerivedValue
                                                name="avgOtherAttr"
                                                value={steps.avgOtherAttr}
                                                explain={
                                                    steps.avgOtherAttrMode === "min"
                                                        ? "avgOtherAttr = MINAttributeAttackOfOtherType (since minOtherAttr ≥ maxOtherAttr)"
                                                        : "avgOtherAttr = (MINAttributeAttackOfOtherType + MAXAttributeAttackOfOtherType) / 2"
                                                }
                                            />
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="physAtkMult"
                                                value={physAtkMult}
                                                explain="physAtkMult = PhysicalAttackMultiplier / 100"
                                            />
                                            <Op tone="add">+</Op>
                                            <StatValue statKey="FlatDamage" value={steps.cache.flatDmg} />
                                            <Op tone="add">+</Op>
                                            <DerivedValue
                                                name="avgYourAttr"
                                                value={steps.avgYourAttr}
                                                explain="avgYourAttr = (MINAttributeAttackOfYOURType + MAXAttributeAttackOfYOURType) / 2"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="elemMult"
                                                value={elemMult}
                                                explain="elemMult = MainElementMultiplier / 100"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="elementModifier"
                                                value={steps.elementModifier}
                                                explain="elementModifier = 1 + AttributeAttackPenetrationOfYOURType/200 + AttributeAttackDMGBonusOfYOURType/100"
                                            />
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="dmgBoost"
                                                value={steps.dmgBoost}
                                                explain="dmgBoost = 1 + DamageBoost / 100"
                                            />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.base} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>minDamage</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>ROUND1(</Name>
                                            <Op tone="paren">(</Op>
                                            <DerivedValue
                                                name="minInnerPhys"
                                                value={minInnerPhys}
                                                explain="minInnerPhys = MinPhysicalAttack*physPenFactor*physBonusFactor + MINAttributeAttackOfOtherType"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="physAtkMult"
                                                value={physAtkMult}
                                                explain="physAtkMult = PhysicalAttackMultiplier / 100"
                                            />
                                            <Op tone="add">+</Op>
                                            <StatValue statKey="FlatDamage" value={steps.cache.flatDmg} />
                                            <Op tone="add">+</Op>
                                            <StatValue
                                                statKey="MINAttributeAttackOfYOURType"
                                                value={steps.cache.minYourAttr}
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="elemMult"
                                                value={elemMult}
                                                explain="elemMult = MainElementMultiplier / 100"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="elemFactor"
                                                value={elemFactor}
                                                explain="elemFactor = 1 + AttributeAttackPenetrationOfYOURType/200 + AttributeAttackDMGBonusOfYOURType/100"
                                            />
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <Num n={1.02} />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="dmgBoost"
                                                value={dmgBoost}
                                                explain="dmgBoost = 1 + DamageBoost / 100"
                                            />
                                            <Name>)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.minDamage} />
                                            <span className="text-xs text-muted-foreground">
                                                (raw≈{fmt(minDamageApprox, 2)})
                                            </span>
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>critical</Name>
                                            <Op tone="eq">=</Op>
                                            <Op tone="paren">(</Op>
                                            <DerivedValue
                                                name="maxInnerPhys"
                                                value={maxInnerPhys}
                                                explain="maxInnerPhys = MaxPhysicalAttack*physPenFactor*physBonusFactor + max(MINAttributeAttackOfOtherType, MAXAttributeAttackOfOtherType)"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="physAtkMult"
                                                value={physAtkMult}
                                                explain="physAtkMult = PhysicalAttackMultiplier / 100"
                                            />
                                            <Op tone="add">+</Op>
                                            <StatValue statKey="FlatDamage" value={steps.cache.flatDmg} />
                                            <Op tone="add">+</Op>
                                            <StatValue
                                                statKey="MAXAttributeAttackOfYOURType"
                                                value={steps.cache.maxYourAttr}
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="elemMult"
                                                value={elemMult}
                                                explain="elemMult = MainElementMultiplier / 100"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="elemFactor"
                                                value={elemFactor}
                                                explain="elemFactor = 1 + AttributeAttackPenetrationOfYOURType/200 + AttributeAttackDMGBonusOfYOURType/100"
                                            />
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="criticalBonus"
                                                value={criticalBonus}
                                                explain="criticalBonus = 1 + CriticalDMGBonus / 100"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="dmgBoost"
                                                value={dmgBoost}
                                                explain="dmgBoost = 1 + DamageBoost / 100"
                                            />
                                            <Op tone="eq">=</Op>
                                            <Num n={damage.critical} />
                                            <span className="text-xs text-muted-foreground">
                                                (raw≈{fmt(critDamageApprox, 2)})
                                            </span>
                                        </ExprRow>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-zinc-300">Expected (numbers)</div>

                                        <ExprRow>
                                            <Name>P</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.P} />
                                            <Name>As</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.As} />
                                            <Name>Cs</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.Cs} />
                                            <Name>CD</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={cd} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>noPrecision</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.noPrecision} />
                                            <Name>precision</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.precision} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>expected</Name>
                                            <Op tone="eq">=</Op>
                                            <Op tone="paren">(</Op>
                                            <Num n={1} />
                                            <Op tone="add">-</Op>
                                            <Num n={steps.P} />
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <Num n={steps.noPrecision} />
                                            <Op tone="add">+</Op>
                                            <Num n={steps.P} />
                                            <Op tone="mul">×</Op>
                                            <Num n={steps.precision} />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.expected} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>affinity (maxDamage)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={damage.affinity} />
                                            <span className="text-xs text-muted-foreground">
                                                (raw≈{fmt(affDamageApprox, 2)})
                                            </span>
                                        </ExprRow>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-zinc-300">
                                            Base (used when Precision)
                                        </div>

                                        <ExprRow>
                                            <Name>base</Name>
                                            <Op tone="eq">=</Op>
                                            <Op tone="paren">(</Op>
                                            <Name>
                                                (
                                                <span className="text-sky-200">avgPhysAtk</span>
                                                <Op tone="mul">×</Op>
                                                <span className="text-sky-200">physModifier</span>
                                                <Op tone="mul">×</Op>
                                                <span className="text-sky-200">physBonus</span>
                                                <Op tone="add">+</Op>
                                                <span className="text-sky-200">avgOtherAttr</span>
                                                )
                                            </Name>
                                            <Op tone="mul">×</Op>
                                            <Op tone="paren">(</Op>
                                            <Name>physAtkMult</Name>
                                            <Op tone="div">÷</Op>
                                            <Num n={100} />
                                            <Op tone="paren">)</Op>
                                            <Op tone="add">+</Op>
                                            <Name>flatDmg</Name>
                                            <Op tone="add">+</Op>
                                            <Name>
                                                avgYourAttr
                                                <Op tone="mul">×</Op>
                                                (elemMult
                                                <Op tone="div">÷</Op>
                                                100)
                                                <Op tone="mul">×</Op>
                                                elementModifier
                                            </Name>
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <Name>dmgBoost</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.base} />
                                        </ExprRow>

                                        <div className="text-xs text-muted-foreground">
                                            Substituted multipliers: physAtkMult={fmt(physAtkMult)} ·
                                            elemMult={fmt(elemMult)}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-zinc-300">
                                            Probabilities (clamp + normalize)
                                        </div>

                                        <ExprRow>
                                            <Name>P_raw</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>PrecisionRate</Name>
                                            <Op tone="div">÷</Op>
                                            <Num n={100} />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.P_raw} />
                                            <Name>P</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>clamp01(P_raw)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.P} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>A_raw</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>AffinityRate</Name>
                                            <Op tone="div">÷</Op>
                                            <Num n={100} />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.A_raw} />
                                            <Name>A</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>clamp01(A_raw)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.A} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>C_raw</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>CriticalRate</Name>
                                            <Op tone="div">÷</Op>
                                            <Num n={100} />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.C_raw} />
                                            <Name>C</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>clamp01(C_raw)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.C} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>scale</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>
                                                (A + C {" "}
                                                <Op tone="cmp">&gt;</Op>
                                                {" "}1) ? 1 ÷ (A + C) : 1
                                            </Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.scale} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>As</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>A</Name>
                                            <Op tone="mul">×</Op>
                                            <Name>scale</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.As} />
                                            <Name>Cs</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>C</Name>
                                            <Op tone="mul">×</Op>
                                            <Name>scale</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.Cs} />
                                        </ExprRow>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-zinc-300">
                                            Expected damage (from damageFormula)
                                        </div>

                                        <ExprRow>
                                            <Name>minDamage</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.minDamage} />
                                            <Name>maxDamage (affinity)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.maxDamage} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>noPrecision</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>As</Name>
                                            <Op tone="mul">×</Op>
                                            <Name>maxDamage</Name>
                                            <Op tone="add">+</Op>
                                            <Op tone="paren">(</Op>
                                            <Num n={1} />
                                            <Op tone="add">-</Op>
                                            <Name>As</Name>
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <Name>minDamage</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.noPrecision} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>precision</Name>
                                            <Op tone="eq">=</Op>
                                            <Name>As</Name>
                                            <Op tone="mul">×</Op>
                                            <Name>maxDamage</Name>
                                            <Op tone="add">+</Op>
                                            <Name>Cs</Name>
                                            <Op tone="mul">×</Op>
                                            <Name>base</Name>
                                            <Op tone="mul">×</Op>
                                            <Op tone="paren">(</Op>
                                            <Num n={1} />
                                            <Op tone="add">+</Op>
                                            <Name>CD</Name>
                                            <Op tone="paren">)</Op>
                                            <Op tone="add">+</Op>
                                            <Op tone="paren">(</Op>
                                            <Num n={1} />
                                            <Op tone="add">-</Op>
                                            <Name>As</Name>
                                            <Op tone="add">-</Op>
                                            <Name>Cs</Name>
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <Name>base</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.precision} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>expected</Name>
                                            <Op tone="eq">=</Op>
                                            <Op tone="paren">(</Op>
                                            <Num n={1} />
                                            <Op tone="add">-</Op>
                                            <Name>P</Name>
                                            <Op tone="paren">)</Op>
                                            <Op tone="mul">×</Op>
                                            <Name>noPrecision</Name>
                                            <Op tone="add">+</Op>
                                            <Name>P</Name>
                                            <Op tone="mul">×</Op>
                                            <Name>precision</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.expected} />
                                        </ExprRow>

                                        <div className="text-xs text-muted-foreground">
                                            This is the per-hit-group Expected Normal (avg) before hit count.
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
