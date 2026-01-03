// app/ui/damage/SkillDamagePanel.tsx
import { Skill } from "@/app/domain/skill/types";
import DamageLine from "./DamageLine";

interface SkillDamageResult {
    total: number;
    perHit: number[];
    averageBreakdown: {
        normal: number;
        critical: number;
        affinity: number;
    };
}

interface Props {
    skill: Skill;
    result: SkillDamageResult;
}

export function SkillDamagePanel({ skill, result }: Props) {
    return (
        <div className="space-y-3">
            <div className="font-semibold">{skill.name}</div>

            <DamageLine
                label="Total Skill Damage"
                value={Math.round(result.total)}
                percent={0}
                color="violet"
            />

            <div className="text-xs text-muted-foreground">
                Hits:{" "}
                {result.perHit.map((h, i) => (
                    <span key={i} className="mr-1">
                        {Math.round(h)}
                    </span>
                ))}
            </div>
        </div>
    );
}
