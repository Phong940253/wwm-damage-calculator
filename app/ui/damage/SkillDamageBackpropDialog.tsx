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
import { useI18n } from "@/app/providers/I18nProvider";

function fmt(n: number, digits = 4) {
    if (!Number.isFinite(n)) return "NaN";
    const p = 10 ** digits;
    const rounded = Math.round(n * p) / p;
    return String(rounded);
}

function Num({ n }: { n: number }) {
    return (
        <span className="font-mono text-xs text-foreground tabular-nums">{fmt(n)}</span>
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
    if (k.includes("flat")) return "border-border bg-muted/50 text-foreground";
    return "border-white/15 bg-white/5 text-foreground";
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
                        font-mono text-xs tabular-nums text-foreground
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
        <span className="font-mono text-xs text-foreground/85 whitespace-normal break-words min-w-0">
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
                        ? "text-muted-foreground"
                        : tone === "cmp"
                            ? "text-amber-300"
                            : "text-muted-foreground";

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

function Legend({
    title,
    add,
    multiply,
    divide,
    assign,
    takeMax,
    clamp,
}: {
    title: string;
    add: string;
    multiply: string;
    divide: string;
    assign: string;
    takeMax: string;
    clamp: string;
}) {
    return (
        <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground/85">{title}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-mono">
                    <span className="text-emerald-300">+</span> {add}
                </span>
                <span className="font-mono">
                    <span className="text-sky-300">×</span> {multiply}
                </span>
                <span className="font-mono">
                    <span className="text-fuchsia-300">÷</span> {divide}
                </span>
                <span className="font-mono">
                    <span className="text-muted-foreground">=</span> {assign}
                </span>
                <span className="font-mono">
                    <span className="text-amber-300">max(·)</span> {takeMax}
                </span>
                <span className="font-mono">
                    <span className="text-foreground/85">clamp01(x)</span> {clamp}
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
    const { language } = useI18n();
    const text = language === "vi"
        ? {
            dialogDescription:
                "Truy vết sát thương (từ [app/domain/damage/damageFormula.ts]) — hiển thị dưới dạng phép tính dễ đọc (không dùng KaTeX)",
            operatorLegend: "Chú giải toán tử",
            add: "cộng",
            multiply: "nhân",
            divide: "chia",
            assign: "gán/kết quả",
            takeMax: "lấy giá trị lớn nhất",
            clamp: "giới hạn về [0,1]",
            hitGroup: "Nhóm hit",
            repeats: "lặp",
            min: "thấp nhất",
            avg: "trung bình",
            crit: "chí mạng",
            aff: "affinity",
            baseStats: "Chỉ số gốc (di chuột để xem tên chỉ số)",
            physAtkDerivation: "Tính toán Min/MaxPhysicalAttack",
            dmgBoostBreakdown: "Phân rã Damage Boost",
            maxInnerPhysDerivation: "Phân tích maxInnerPhys",
            maxYourAttrContribution: "Đóng góp maxYourAttr",
            substitutedNumbers: "Thay số (dạng số)",
            expectedNumbers: "Kỳ vọng (dạng số)",
            baseWhenPrecision: "Base (dùng khi có Precision)",
            substitutedMultipliers: "Hệ số thay số",
            probabilities: "Xác suất (clamp + chuẩn hóa)",
            expectedFromFormula: "Sát thương kỳ vọng (từ damageFormula)",
            perHitGroupNote: "Đây là Expected Normal (trung bình) cho mỗi nhóm hit trước khi nhân số hit.",
        }
        : {
            dialogDescription:
                "Damage backprop (from [app/domain/damage/damageFormula.ts]) — shown as readable arithmetic (no KaTeX)",
            operatorLegend: "Operator legend",
            add: "add",
            multiply: "multiply",
            divide: "divide",
            assign: "assign/result",
            takeMax: "take max",
            clamp: "clamp to [0,1]",
            hitGroup: "Hit group",
            repeats: "repeats",
            min: "min",
            avg: "avg",
            crit: "crit",
            aff: "aff",
            baseStats: "Base stats (hover for stat name)",
            physAtkDerivation: "Min/MaxPhysicalAttack derivation",
            dmgBoostBreakdown: "Damage Boost breakdown",
            maxInnerPhysDerivation: "maxInnerPhys derivation",
            maxYourAttrContribution: "maxYourAttr contribution",
            substitutedNumbers: "Substituted (numbers)",
            expectedNumbers: "Expected (numbers)",
            baseWhenPrecision: "Base (used when Precision)",
            substitutedMultipliers: "Substituted multipliers",
            probabilities: "Probabilities (clamp + normalize)",
            expectedFromFormula: "Expected damage (from damageFormula)",
            perHitGroupNote: "This is the per-hit-group Expected Normal (avg) before hit count.",
        };

    const hitExplains = useMemo(() => {
        const damageSkillTypes = skill.damageSkillType ?? ["normal"];

        return skill.hits.map((hit, hitIndex) => {
            const hitCtx = createSkillContext(ctx, {
                skillId: skill.id,
                physicalMultiplier: hit.physicalMultiplier,
                elementMultiplier: hit.elementMultiplier,
                flatPhysical: hit.flatPhysical,
                flatAttribute: hit.flatAttribute,
                damageSkillTypes,
                weaponType: skill.weaponType,
            });

            const damage = calculateDamage(hitCtx);
            const steps = explainCalcExpectedNormal(hitCtx.get, damage.affinity);
            const minPhysExplain = hitCtx.explain!("MinPhysicalAttack") ?? { key: "MinPhysicalAttack", total: 0, lines: [] };
            const maxPhysExplain = hitCtx.explain!("MaxPhysicalAttack") ?? { key: "MaxPhysicalAttack", total: 0, lines: [] };
            const bossPhysDefExplain = hitCtx.explain!("BossPhysDef") ?? { key: "BossPhysDef", total: 0, lines: [] };
            const dmgBoostExplain = hitCtx.explain!("DamageBoost") ?? { key: "DamageBoost", total: 0, lines: [] };
            const maxYourAttrExplain = hitCtx.explain!("MAXAttributeAttackOfYOURType") ?? { key: "MAXAttributeAttackOfYOURType", total: 0, lines: [] };

            // Collect non-zero skill-type-specific damage boost components
            const boostComponents: { key: string; value: number }[] = [];
            const allMartial = ctx.get("AllMartialArtsBoost");
            if (allMartial > 0) boostComponents.push({ key: "AllMartialArtsBoost", value: allMartial });
            if (skill.category === "martial-art-skill") {
              const v = ctx.get("MartialArtSkillDamageBoost");
              if (v > 0) boostComponents.push({ key: "MartialArtSkillDamageBoost", value: v });
            }
            if (damageSkillTypes.includes("charged")) {
              const v = ctx.get("ChargeSkillDamageBoost");
              if (v > 0) boostComponents.push({ key: "ChargeSkillDamageBoost", value: v });
            }
            if (damageSkillTypes.includes("ballistic")) {
              const v = ctx.get("BallisticSkillDamageBoost");
              if (v > 0) boostComponents.push({ key: "BallisticSkillDamageBoost", value: v });
            }
            if (damageSkillTypes.includes("pursuit")) {
              const v = ctx.get("PursuitSkillDamageBoost");
              if (v > 0) boostComponents.push({ key: "PursuitSkillDamageBoost", value: v });
            }
            const weaponArtMap: Record<string, string> = {
              Sword: "ArtOfSwordDMGBoost",
              Spear: "ArtOfSpearDMGBoost",
              Fan: "ArtOfFanDMGBoost",
              Umbrella: "ArtOfUmbrellaDMGBoost",
              "Horizontal Blade": "ArtOfHorizontalBladeDMGBoost",
              "Mo Blade": "ArtOfMoBladeDMGBoost",
              "Dual Blades": "ArtOfDualBladesDMGBoost",
              "Rope Dart": "ArtOfRopeDartDMGBoost",
            };
            const weaponArtKey = skill.weaponType ? weaponArtMap[skill.weaponType] : null;
            if (weaponArtKey) {
              const v = ctx.get(weaponArtKey);
              if (v > 0) boostComponents.push({ key: weaponArtKey, value: v });
            }
            if (skill.id && ["vernal_umbrella_light_spring_away"].includes(skill.id)) {
              const v = ctx.get("SpringAwayDamageBoost");
              if (v > 0) boostComponents.push({ key: "SpringAwayDamageBoost", value: v });
            }

            return {
                hitIndex,
                hitCount: hit.hits,
                hit,
                damage,
                steps,
                minPhysExplain,
                maxPhysExplain,
                bossPhysDefExplain,
                dmgBoostExplain,
                boostComponents,
                maxYourAttrExplain,
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
                            <DialogDescription>{text.dialogDescription}</DialogDescription>
                        </DialogHeader>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
                        <Legend
                            title={text.operatorLegend}
                            add={text.add}
                            multiply={text.multiply}
                            divide={text.divide}
                            assign={text.assign}
                            takeMax={text.takeMax}
                            clamp={text.clamp}
                        />

                        {hitExplains.map(({ hitIndex, hitCount, hit, damage, steps, minPhysExplain, maxPhysExplain, bossPhysDefExplain, dmgBoostExplain, boostComponents, maxYourAttrExplain }) => {
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
                                            <div className="text-sm font-semibold">{text.hitGroup} {hitIndex + 1}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {text.repeats}: {hitCount} · physMult: {fmt(hit.physicalMultiplier)} ·
                                                elemMult: {fmt(hit.elementMultiplier)}
                                            </div>
                                        </div>

                                        <div className="text-right text-xs text-muted-foreground">
                                            <div>
                                                {text.min} <span className="text-foreground">{fmt(damage.min, 1)}</span>
                                            </div>
                                            <div>
                                                {text.avg} <span className="text-foreground">{fmt(damage.normal, 1)}</span>
                                            </div>
                                            <div>
                                                {text.crit} <span className="text-foreground">{fmt(damage.critical, 1)}</span>
                                            </div>
                                            <div>
                                                {text.aff} <span className="text-foreground">{fmt(damage.affinity, 1)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-white/10" />

                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground">
                                            {text.baseStats}
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
                                                statKey="NamelessSwordChargedSkillDMGBoost"
                                                value={ctx.get("NamelessSwordChargedSkillDMGBoost")}
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
                                        <div className="text-sm font-semibold text-foreground">{text.physAtkDerivation}</div>

                                        <ExprRow>
                                            <Name>MinPhysAtk</Name>
                                            <Op tone="eq">=</Op>
                                            {minPhysExplain.lines.map((line, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <Op tone="add">+</Op>}
                                                    <DerivedValue name={line.label} value={line.value} explain={line.note || ""} />
                                                </React.Fragment>
                                            ))}
                                            <Op tone="eq">=</Op>
                                            <Num n={minPhysExplain.total} />
                                        </ExprRow>
                                        <ExprRow>
                                            <Name>MaxPhysAtk</Name>
                                            <Op tone="eq">=</Op>
                                            {maxPhysExplain.lines.map((line, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <Op tone="add">+</Op>}
                                                    <DerivedValue name={line.label} value={line.value} explain={line.note || ""} />
                                                </React.Fragment>
                                            ))}
                                            <Op tone="eq">=</Op>
                                            <Num n={maxPhysExplain.total} />
                                        </ExprRow>

                                        {bossPhysDefExplain && bossPhysDefExplain.total > 0 && (
                                            <ExprRow>
                                                <Name>BossPhysDef</Name>
                                                <Op tone="eq">=</Op>
                                                {bossPhysDefExplain.lines.map((line, i) => (
                                                    <React.Fragment key={i}>
                                                        {i > 0 && <Op tone="add">+</Op>}
                                                        <DerivedValue name={line.label} value={line.value} explain={line.note || ""} />
                                                    </React.Fragment>
                                                ))}
                                                <Op tone="eq">=</Op>
                                                <Num n={bossPhysDefExplain.total} />
                                            </ExprRow>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground">{text.dmgBoostBreakdown}</div>

                                        <ExprRow>
                                            <Name>dmgBoost (stats)</Name>
                                            <Op tone="eq">=</Op>
                                            {dmgBoostExplain.lines.length > 0 && (
                                                <>
                                                    <DerivedValue name={dmgBoostExplain.lines[0].label} value={dmgBoostExplain.lines[0].value} explain={dmgBoostExplain.lines[0].note || ""} />
                                                    {dmgBoostExplain.lines.slice(1).map((line, i) => (
                                                        <React.Fragment key={i}>
                                                            <Op tone="add">+</Op>
                                                            <DerivedValue name={line.label} value={line.value} explain={line.note || ""} />
                                                        </React.Fragment>
                                                    ))}
                                                </>
                                            )}
                                            <Op tone="eq">=</Op>
                                            <Num n={dmgBoostExplain.total} />
                                        </ExprRow>

                                        {boostComponents.length > 0 && (
                                            <ExprRow>
                                                <Name>Skill‑type‑specific</Name>
                                                <Op tone="eq">=</Op>
                                                {boostComponents.map((c, i) => (
                                                    <React.Fragment key={c.key}>
                                                        {i > 0 && <Op tone="add">+</Op>}
                                                        <StatValue statKey={c.key} value={c.value} unit="percent" />
                                                    </React.Fragment>
                                                ))}
                                            </ExprRow>
                                        )}

                                        <ExprRow>
                                            <Name>dmgBoost (total)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.dmgBoost} />
                                            <span className="text-xs text-muted-foreground">
                                                (factor: {fmt(steps.dmgBoost, 4)})
                                            </span>
                                        </ExprRow>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground">{text.maxInnerPhysDerivation}</div>

                                        <ExprRow>
                                            <Name>MaxPhysicalAttack (base)</Name>
                                            <Op tone="eq">=</Op>
                                            {maxPhysExplain.lines.map((line, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <Op tone="add">+</Op>}
                                                    <DerivedValue name={line.label} value={line.value} explain={line.note || ""} />
                                                </React.Fragment>
                                            ))}
                                            <Op tone="eq">=</Op>
                                            <Num n={maxPhysExplain.total} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>× physicalMultiplier</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={maxPhysExplain.total} />
                                            <Op tone="mul">×</Op>
                                            <Num n={hit.physicalMultiplier} />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.maxPhysAtk} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>physPortion</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.maxPhysAtk} />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="physPenFactor"
                                                value={physPenFactor}
                                                explain="1 + physPen/200"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="physBonusFactor"
                                                value={physBonusFactor}
                                                explain="1 + physDmgBonus/100"
                                            />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.maxPhysAtk * physPenFactor * physBonusFactor} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>otherAttr</Name>
                                            <Op tone="eq">=</Op>
                                            <Op tone="paren">max(</Op>
                                            <Num n={steps.cache.minOtherAttr} />
                                            <span className="font-mono text-xs text-muted-foreground px-0.5">,</span>
                                            <Num n={steps.cache.maxOtherAttr} />
                                            <Op tone="paren">)</Op>
                                            <Op tone="eq">=</Op>
                                            <Num n={maxOtherAttr} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>maxInnerPhys</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.maxPhysAtk * physPenFactor * physBonusFactor} />
                                            <Op tone="add">+</Op>
                                            <Num n={maxOtherAttr} />
                                            <Op tone="eq">=</Op>
                                            <Num n={maxInnerPhys} />
                                        </ExprRow>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground">{text.maxYourAttrContribution}</div>

                                        <ExprRow>
                                            <Name>MAXAttributeAttackOfYOURType (base)</Name>
                                            <Op tone="eq">=</Op>
                                            {maxYourAttrExplain.lines.map((line, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <Op tone="add">+</Op>}
                                                    <DerivedValue name={line.label} value={line.value} explain={line.note || ""} />
                                                </React.Fragment>
                                            ))}
                                            <Op tone="eq">=</Op>
                                            <Num n={maxYourAttrExplain.total} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>maxYourAttr (skill)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={maxYourAttrExplain.total} />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="elementMultiplier"
                                                value={hit.elementMultiplier}
                                                explain="skill-specific elementMultiplier"
                                            />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.maxYourAttr} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>× elemMult</Name>
                                            <Op tone="eq">=</Op>
                                            <DerivedValue
                                                name="MainElementMultiplier"
                                                value={steps.cache.elementMult}
                                                explain="MainElementMultiplier"
                                            />
                                            <Op tone="div">/</Op>
                                            <Num n={100} />
                                            <Op tone="eq">=</Op>
                                            <Num n={elemMult} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>× elemFactor</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={1} />
                                            <Op tone="add">+</Op>
                                            <Num n={steps.cache.attrPenetration} />
                                            <Op tone="div">/</Op>
                                            <Num n={200} />
                                            <Op tone="add">+</Op>
                                            <Num n={steps.cache.attrDmgBonus} />
                                            <Op tone="div">/</Op>
                                            <Num n={100} />
                                            <Op tone="eq">=</Op>
                                            <Num n={elemFactor} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>maxYourAttr contribution</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.maxYourAttr} />
                                            <Op tone="mul">×</Op>
                                            <Num n={elemMult} />
                                            <Op tone="mul">×</Op>
                                            <Num n={elemFactor} />
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.maxYourAttr * elemMult * elemFactor} />
                                        </ExprRow>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground">{text.substitutedNumbers}</div>

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
                                                name="physPenModifier"
                                                value={steps.physPenModifier}
                                                explain="physPenModifier = (physPen <= effectiveRes) ? 1 + (physPen - effectiveRes)/200 : 1 + (physPen - effectiveRes)/100"
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

                                        <ExprRow>
                                            <Name>affinity</Name>
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
                                                name="affinityBonus"
                                                value={affinityBonus}
                                                explain="affinityBonus = 1 + AffinityDMGBonus / 100"
                                            />
                                            <Op tone="mul">×</Op>
                                            <DerivedValue
                                                name="dmgBoost"
                                                value={dmgBoost}
                                                explain="dmgBoost = 1 + DamageBoost / 100"
                                            />
                                            <Op tone="eq">=</Op>
                                            <Num n={damage.affinity} />
                                        </ExprRow>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground">{text.expectedNumbers}</div>

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
                                        <div className="text-sm font-semibold text-foreground">
                                            {text.baseWhenPrecision}
                                        </div>

                                        <ExprRow>
                                            <Name>base</Name>
                                            <Op tone="eq">=</Op>
                                            <Op tone="paren">(</Op>
                                            <Name>
                                                (
                                                <span className="text-sky-200">avgPhysAtk</span>
                                                <Op tone="mul">×</Op>
                                                <span className="text-sky-200">physPenModifier</span>
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
                                            {text.substitutedMultipliers}: physAtkMult={fmt(physAtkMult)} ·
                                            elemMult={fmt(elemMult)}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground">
                                            {text.probabilities}
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
                                        <div className="text-sm font-semibold text-foreground">
                                            {text.expectedFromFormula}
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
                                            {text.perHitGroupNote}
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
