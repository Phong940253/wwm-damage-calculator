"use client";

import { Skill } from "@/app/domain/skill/types";
import DamageLine from "./DamageLine";
import { SkillDamageResult } from "@/app/domain/damage/type";
import { DamageContext } from "@/app/domain/damage/damageContext";
import React, { useState } from "react";
import { SkillDamageBackpropDialog } from "./SkillDamageBackpropDialog";

interface Props {
    skill: Skill;
    result: SkillDamageResult;
    ctx: DamageContext;
    showHeader?: boolean;
    isEven?: boolean;
}

export function SkillDamagePanel({ skill, result, ctx, showHeader = false, isEven = false }: Props) {
    const [open, setOpen] = useState(false);
    const total = result.total;
    const formatList = (values: number[]) => values.map(Math.round).join(" + ");

    const columnTemplateClass = "lg:grid-cols-[minmax(0,_1fr)_repeat(4,_96px)]";

    const perHitMin = result.perHit.map((hit) => hit.min.value);
    const perHitNormal = result.perHit.map((hit) => hit.normal.value);
    const perHitCritical = result.perHit.map((hit) => hit.critical.value);
    const perHitAffinity = result.perHit.map((hit) => hit.affinity.value);

    const hitsTooltip = [
        `Abrasion: ${formatList(perHitMin)}`,
        `Average: ${formatList(perHitNormal)}`,
        `Critical: ${formatList(perHitCritical)}`,
        `Affinity: ${formatList(perHitAffinity)}`,
    ].join("\n");

    const hitTooltipByType = {
        min: formatList(perHitMin),
        normal: formatList(perHitNormal),
        critical: formatList(perHitCritical),
        affinity: formatList(perHitAffinity),
    };

    return (
        <>
            <SkillDamageBackpropDialog open={open} onOpenChange={setOpen} skill={skill} ctx={ctx} />
            {showHeader && (
                <div
                    className={`
                        grid grid-cols-2 gap-2 text-[11px] text-muted-foreground
                        md:grid-cols-3
                        ${columnTemplateClass}
                    `}
                >
                    <div className="col-span-2 md:col-span-1 lg:col-span-1"></div>
                    <div className="text-right">Abrasion</div>
                    <div className="text-right">Average</div>
                    <div className="text-right">Critical</div>
                    <div className="text-right">Affinity</div>
                </div>
            )}

            {/* ================= Damage table (responsive) ================= */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`
                    w-full grid grid-cols-2 gap-2 text-xs items-center text-left
                    md:grid-cols-3
                    ${columnTemplateClass}
                    ${isEven ? "bg-zinc-800/30" : ""}
                    rounded-md
                    hover:bg-zinc-700/25
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    min-h-[44px]
        `}
            >
                <div
                    className="
                        rounded-md
                        w-full px-2 py-2 flex flex-col gap-1 justify-center
                        col-span-2 md:col-span-1 lg:col-span-1
                    "
                    title={hitsTooltip}
                >
                    <span className="text-sm font-semibold leading-tight text-muted-foreground">{skill.name}</span>
                </div>

                <div className="justify-self-end flex items-center" title={hitTooltipByType.min}>
                    <DamageLine
                        label=""
                        value={Math.round(total.min.value)}
                        percent={0}
                        color="silver"
                    />
                </div>
                <div className="justify-self-end flex items-center" title={hitTooltipByType.normal}>
                    <DamageLine
                        label=""
                        value={Math.round(total.normal.value)}
                        percent={0}
                        color="emerald"
                    />
                </div>
                <div className="justify-self-end flex items-center" title={hitTooltipByType.critical}>
                    <DamageLine
                        label=""
                        value={Math.round(total.critical.value)}
                        percent={0}
                        color="gold"
                    />
                </div>
                <div className="justify-self-end flex items-center" title={hitTooltipByType.affinity}>
                    <DamageLine
                        label=""
                        value={Math.round(total.affinity.value)}
                        percent={0}
                        color="amber"
                    />
                </div>
            </button>

            {/* ================= Notes ================= */}
            {skill.notes && skill.notes !== "Placeholder multipliers" && (
                <div className="text-[11px] italic text-muted-foreground">
                    {skill.notes}
                </div>
            )}
        </>
    );
}
