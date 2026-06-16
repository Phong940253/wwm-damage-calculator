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
import {
  explainCalcExpectedNormal,
  buildFormulaPipeline,
  text as exprText,
  type ExprNode,
  type StepDef,
  type FormulaGroup,
} from "@/app/domain/damage/damageFormula";
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

/* =============================
   Generic formula pipeline renderer
   ============================= */

function mapOp(op: string): "add" | "mul" | "div" | "eq" | "paren" | "cmp" {
  switch (op) {
    case "+": return "add";
    case "×": return "mul";
    case "−": return "add";
    case "/": return "div";
    case "=": return "eq";
    case "(": case ")": return "paren";
    default: return "eq";
  }
}

function RenderExpr({ node }: { node: ExprNode }) {
  switch (node.t) {
    case "num":
      return <Num n={node.v} />;
    case "stat":
      return <StatValue statKey={node.key} value={node.value} />;
    case "comp":
      return <DerivedValue name={node.label} value={node.value} explain={node.explain} />;
    case "name":
      return <Name>{node.label}</Name>;
    case "binop":
      return (
        <>
          <RenderExpr node={node.left} />
          <Op tone={mapOp(node.op)}>{node.op}</Op>
          <RenderExpr node={node.right} />
        </>
      );
    case "call":
      return (
        <>
          <Name>{node.name}</Name>
          <Op tone="paren">(</Op>
          {node.args.map((a, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-muted-foreground font-mono text-xs px-0.5">,</span>}
              <RenderExpr node={a} />
            </React.Fragment>
          ))}
          <Op tone="paren">)</Op>
        </>
      );
    case "text":
      return <span className="text-xs text-muted-foreground">{node.text}</span>;
    case "clamp01":
      return (
        <>
          <Name>clamp01(</Name>
          <RenderExpr node={node.arg} />
          <Op tone="paren">)</Op>
        </>
      );
  }
}

function FormulaStepRow({ step }: { step: StepDef }) {
  return (
    <ExprRow>
      <Name>{step.label}</Name>
      <Op tone="eq">=</Op>
      <RenderExpr node={step.expr} />
      <Op tone="eq">=</Op>
      <Num n={step.result} />
    </ExprRow>
  );
}

function FormulaGroupSection({ group }: { group: FormulaGroup }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-foreground">{group.title}</div>
      {group.steps.map((step, i) => (
        <FormulaStepRow key={i} step={step} />
      ))}
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
            flatDmgBreakdown: "Phân rã FlatDamage",
            baseFlatDmg: "FlatDamage (gốc)",
            flatPhysical: "flatPhysical (kỹ năng)",
            flatAttribute: "flatAttribute (kỹ năng)",
            totalFlatDmg: "Tổng FlatDamage",
            expectedNumbers: "Kỳ vọng (dạng số)",
            baseWhenPrecision: "Base (dùng khi có Precision)",
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
            flatDmgBreakdown: "FlatDamage breakdown",
            baseFlatDmg: "base FlatDamage",
            flatPhysical: "flatPhysical (skill)",
            flatAttribute: "flatAttribute (skill)",
            totalFlatDmg: "total FlatDamage",
            expectedNumbers: "Expected (numbers)",
            baseWhenPrecision: "Base (used when Precision)",
            probabilities: "Probabilities (clamp + normalize)",
            expectedFromFormula: "Expected damage (from damageFormula)",
            perHitGroupNote: "This is the per-hit-group Expected Normal (avg) before hit count.",
        };

    const hitExplains = useMemo(() => {
        const damageSkillTypes = skill.damageSkillType ?? ["normal"];

        return skill.hits.map((hit, hitIndex) => {
            const hitCtx = createSkillContext(ctx, {
                skillId: skill.id,
                category: skill.category,
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
            const flatDmgExplain = ctx.explain!("FlatDamage") ?? { key: "FlatDamage", total: 0, lines: [] };

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

            const formulaGroups = buildFormulaPipeline(steps.cache);

            return {
                hitIndex,
                hitCount: hit.hits,
                hit,
                damage,
                steps,
                formulaGroups,
                minPhysExplain,
                maxPhysExplain,
                bossPhysDefExplain,
                dmgBoostExplain,
                boostComponents,
                flatDmgExplain,
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

                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-5 space-y-6">
                        <Legend
                            title={text.operatorLegend}
                            add={text.add}
                            multiply={text.multiply}
                            divide={text.divide}
                            assign={text.assign}
                            takeMax={text.takeMax}
                            clamp={text.clamp}
                        />

                        {hitExplains.map(({ hitIndex, hitCount, hit, damage, steps, formulaGroups, minPhysExplain, maxPhysExplain, bossPhysDefExplain, dmgBoostExplain, boostComponents, flatDmgExplain }) => {
                            const cd = steps.CD;

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
                                                value={steps.cache.physPen}
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
                                                value={steps.cache.physMul}
                                                unit="percent"
                                            />
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
                                                value={steps.cache.eleMul}
                                                unit="percent"
                                            />
                                            <StatValue
                                                statKey="AttributeAttackPenetrationOfYOURType"
                                                value={steps.cache.elePen}
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
                                            <Name>bossDmgBoost (extra)</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.bossDmgBoost} />
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>familyDmgBonus</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.familyDmgBonus} />
                                            <span className="text-xs text-muted-foreground">
                                                (factor: {fmt(steps.familyMult, 4)})
                                            </span>
                                        </ExprRow>

                                        <ExprRow>
                                            <Name>dmgMult total</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.dmgBoost + steps.cache.bossDmgBoost} />
                                            <span className="text-xs text-muted-foreground">
                                                (factor: {fmt(steps.dmgMult, 4)})
                                            </span>
                                        </ExprRow>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground">{text.flatDmgBreakdown}</div>

                                        <ExprRow>
                                            <Name>{text.baseFlatDmg}</Name>
                                            <Op tone="eq">=</Op>
                                            {flatDmgExplain.lines.map((line, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <Op tone="add">+</Op>}
                                                    <DerivedValue name={line.label} value={line.value} explain={line.note || ""} />
                                                </React.Fragment>
                                            ))}
                                            <Op tone="eq">=</Op>
                                            <Num n={flatDmgExplain.total} />
                                        </ExprRow>

                                        {hit.flatPhysical ? (
                                            <ExprRow>
                                                <Name>{text.flatPhysical}</Name>
                                                <Op tone="eq">=</Op>
                                                <Num n={hit.flatPhysical} />
                                            </ExprRow>
                                        ) : null}
                                        {hit.flatAttribute ? (
                                            <ExprRow>
                                                <Name>{text.flatAttribute}</Name>
                                                <Op tone="eq">=</Op>
                                                <Num n={hit.flatAttribute} />
                                            </ExprRow>
                                        ) : null}

                                        <ExprRow>
                                            <Name>{text.totalFlatDmg}</Name>
                                            <Op tone="eq">=</Op>
                                            <Num n={flatDmgExplain.total} />
                                            {hit.flatPhysical ? (
                                                <><Op tone="add">+</Op><Num n={hit.flatPhysical} /></>
                                            ) : null}
                                            {hit.flatAttribute ? (
                                                <><Op tone="add">+</Op><Num n={hit.flatAttribute} /></>
                                            ) : null}
                                            <Op tone="eq">=</Op>
                                            <Num n={steps.cache.flatDmg} />
                                        </ExprRow>
                                    </div>

                                    {formulaGroups.map((g) => (
                                        <FormulaGroupSection key={g.id} group={g} />
                                    ))}

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
                                        </ExprRow>
                                    </div>

                                    <FormulaGroupSection group={{
                                        id: "baseWhenPrecision",
                                        title: text.baseWhenPrecision,
                                        steps: [
                                            {
                                                label: "base (summary)",
                                                result: steps.base,
                                                expr: exprText("(PhysComp + EleComp − BossDef) × familyMult × dmgMult"),
                                            },
                                        ],
                                    }} />

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
