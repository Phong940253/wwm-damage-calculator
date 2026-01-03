// app/ui/damage/SkillDamagePanel.tsx
import { Skill } from "@/app/domain/skill/types";
import DamageLine from "./DamageLine";
import { SkillDamageResult } from "@/app/domain/damage/type";

interface Props {
    skill: Skill;
    result: SkillDamageResult;
}

export function SkillDamagePanel({ skill, result }: Props) {
    return (
        <div
            className="
        space-y-3 rounded-xl
        border border-white/10
        bg-white/5 p-3
      "
        >
            {/* Skill name */}
            <div className="font-semibold text-sm">{skill.name}</div>

            {/* Total damage (Expected / Average) */}
            <DamageLine
                label="Total Skill Damage (Avg)"
                value={Math.round(result.total.normal.value)}
                percent={0}
                color="violet"
            />

            {/* Optional: crit / affinity peak */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <DamageLine
                    label="Crit (Max)"
                    value={Math.round(result.total.critical.value)}
                    percent={0}
                    color="gold"
                />
                <DamageLine
                    label="Affinity (Max)"
                    value={Math.round(result.total.affinity.value)}
                    percent={0}
                    color="amber"
                />
            </div>

            {/* Per-hit breakdown */}
            <div className="text-xs text-muted-foreground">
                Hits:
                <div className="flex flex-wrap gap-1 mt-1">
                    {result.perHit.map((hit, i) => (
                        <span
                            key={i}
                            className="
                rounded-md bg-black/30 px-2 py-0.5
                text-[11px]
              "
                            title={`Avg: ${Math.round(hit.normal.value)}`}
                        >
                            {Math.round(hit.normal.value)}
                        </span>
                    ))}
                </div>
            </div>

            {/* Notes (optional) */}
            {skill.notes && (
                <div className="text-[11px] italic text-muted-foreground">
                    {skill.notes}
                </div>
            )}
        </div>
    );
}
