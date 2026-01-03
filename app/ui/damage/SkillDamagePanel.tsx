"use client";

import { Skill } from "@/app/domain/skill/types";
import DamageLine from "./DamageLine";
import { SkillDamageResult } from "@/app/domain/damage/type";

interface Props {
    skill: Skill;
    result: SkillDamageResult;
}

export function SkillDamagePanel({ skill, result }: Props) {
    const total = result.total;

    return (
        <div
            className="
        space-y-3 p-3
      "
        >
            {/* ================= Skill name ================= */}
            <div className="font-semibold text-sm">{skill.name}</div>

            {/* ================= Damage table (responsive) ================= */}
            <div
                className="
          grid grid-cols-2 gap-2 text-xs
          lg:grid-cols-4
        "
            >
                <DamageLine
                    label="Abrasion"
                    value={Math.round(total.min.value)}
                    percent={0}
                    color="silver"
                />
                <DamageLine
                    label="Average"
                    value={Math.round(total.normal.value)}
                    percent={0}
                    color="emerald"
                />
                <DamageLine
                    label="Critical"
                    value={Math.round(total.critical.value)}
                    percent={0}
                    color="gold"
                />
                <DamageLine
                    label="Affinity"
                    value={Math.round(total.affinity.value)}
                    percent={0}
                    color="amber"
                />
            </div>

            {/* ================= Per-hit breakdown ================= */}
            <div className="text-xs text-muted-foreground">
                Hits (Avg):
                <div
                    className="
            flex flex-wrap gap-1 mt-1
            max-h-16 overflow-y-auto
          "
                >
                    {result.perHit.map((hit, i) => (
                        <span
                            key={i}
                            className="
                rounded-md bg-black/30
                px-2 py-0.5 text-[11px]
              "
                            title={`Abrasion: ${Math.round(hit.min.value)}
Average: ${Math.round(hit.normal.value)}
Critical: ${Math.round(hit.critical.value)}
Affinity: ${Math.round(hit.affinity.value)}`}
                        >
                            {Math.round(hit.normal.value)}
                        </span>
                    ))}
                </div>
            </div>

            {/* ================= Notes ================= */}
            {skill.notes && (
                <div className="text-[11px] italic text-muted-foreground">
                    {skill.notes}
                </div>
            )}
        </div>
    );
}
