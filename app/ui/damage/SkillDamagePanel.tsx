"use client";

import { Skill } from "@/app/domain/skill/types";
import DamageLine from "./DamageLine";
import { SkillDamageResult } from "@/app/domain/damage/type";

interface Props {
    skill: Skill;
    result: SkillDamageResult;
    showHeader?: boolean;
}

export function SkillDamagePanel({ skill, result, showHeader = false }: Props) {
    const total = result.total;
    const hitsTooltip = result.perHit
        .map((hit, i) =>
            `Hit ${i + 1}: Abrasion ${Math.round(hit.min.value)} | Avg ${Math.round(
                hit.normal.value
            )} | Crit ${Math.round(hit.critical.value)} | Aff ${Math.round(
                hit.affinity.value
            )}`
        )
        .join("\n");

    return (
        <div
            className="
        space-y-3 p-3
      "
        >
            {showHeader && (
                <div
                    className="
                        grid grid-cols-2 gap-2 text-[11px] text-muted-foreground
                        md:grid-cols-3
                        lg:grid-cols-5
                    "
                >
                    <div className="col-span-2 md:col-span-1 text-left">Skill</div>
                    <div className="text-center">Abrasion</div>
                    <div className="text-center">Average</div>
                    <div className="text-center">Critical</div>
                    <div className="text-center">Affinity</div>
                </div>
            )}

            {/* ================= Damage table (responsive) ================= */}
            <div
                className="
                    grid grid-cols-2 gap-2 text-xs
                    md:grid-cols-3
                    lg:grid-cols-5
        "
            >
                <div
                    className="
                        rounded-md
                        px-2 py-2 flex flex-col gap-1 justify-center
                        col-span-2 md:col-span-1
                    "
                    title={hitsTooltip}
                >
                    <span className="text-sm font-semibold leading-tight">{skill.name}</span>
                </div>

                <DamageLine
                    label=""
                    value={Math.round(total.min.value)}
                    percent={0}
                    color="silver"
                />
                <DamageLine
                    label=""
                    value={Math.round(total.normal.value)}
                    percent={0}
                    color="emerald"
                />
                <DamageLine
                    label=""
                    value={Math.round(total.critical.value)}
                    percent={0}
                    color="gold"
                />
                <DamageLine
                    label=""
                    value={Math.round(total.affinity.value)}
                    percent={0}
                    color="amber"
                />
            </div>

            {/* ================= Notes ================= */}
            {skill.notes && skill.notes !== "Placeholder multipliers" && (
                <div className="text-[11px] italic text-muted-foreground">
                    {skill.notes}
                </div>
            )}
        </div>
    );
}
