// app/ui/DamagePanel.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Zap, ArrowUpRight } from "lucide-react";
import { DamageResult } from "../../domain/damage/type";
import AverageDamagePie from "./AverageDamagePie";
import { DamageContext } from "@/app/domain/damage/damageContext";
import FinalStatPanel from "./FinalStatPanel";
import { buildFinalStatSections } from "@/app/domain/damage/buildFinalStatSections";
import { useSkillDamage } from "@/app/hooks/useSkillDamage";
import { SKILLS } from "@/app/domain/skill/skills";
import { ElementStats } from "@/app/types";
import { SkillDamagePanel } from "./SkillDamagePanel";
import { Skill } from "@/app/domain/skill/types";

interface Props {
  ctx: DamageContext;
  result: DamageResult;

  showFormula: boolean;
  toggleFormula: () => void;
  formulaSlot?: React.ReactNode;
  warnings?: string[];
  elementStats?: ElementStats
}

export default function DamagePanel({
  ctx,
  result,
  showFormula,
  toggleFormula,
  formulaSlot,
  elementStats,
  warnings = [],
}: Props) {
  const finalStats = buildFinalStatSections(ctx);
  const selectedMartialArtId = elementStats?.martialArtsId;
  const skills = SKILLS.filter((skill) => {
    if (selectedMartialArtId) return skill.martialArtId === selectedMartialArtId;
    if (elementStats?.selected)
      return skill.martialArtId.includes(elementStats.selected);
    return true;
  });

  const skillDamages = useSkillDamage(ctx, skills);
  const completedSkillDamages = skillDamages.filter(
    (entry): entry is { skill: Skill; result: NonNullable<typeof entry.result> } =>
      Boolean(entry.result)
  );

  const categoryOrder: Skill["category"][] = ["basic", "skill", "ultimate"];
  const categoryLabels: Record<Skill["category"], string> = {
    basic: "Basic",
    skill: "Skill",
    ultimate: "Ultimate",
  };

  const groupedSkillDamages = categoryOrder
    .map((category) => ({
      category,
      skills: completedSkillDamages.filter(({ skill }) => skill.category === category),
    }))
    .filter((group) => group.skills.length > 0);

  return (
    <Card
      className="
        flex flex-col
        bg-gradient-to-b from-card/95 to-card/60
        border-none
      "
    >
      <CardContent
        className="
          flex-1 overflow-y-auto space-y-6 pr-2
          scrollbar-thin scrollbar-thumb-zinc-600/40
        "
      >
        <div className="flex flex-col">
          <div className="text-lg pb-4 font-bold">Stats</div>

          <FinalStatPanel sections={finalStats} />

          <div className="flex flex-row gap-x-2 text-lg py-4 font-bold">
            <Zap className="text-yellow-500" /> Damage output
          </div>

          {groupedSkillDamages.map((group) => (
            <div key={group.category}>
              <div className="text-lg py-6 px-2 font-semibold text-muted-foreground tracking-wide capitalize text-white">
                {categoryLabels[group.category]}
              </div>

              {group.skills.map(({ skill, result }, idx) => (
                <SkillDamagePanel
                  key={skill.id}
                  skill={skill}
                  result={result}
                  showHeader={idx === 0}
                />
              ))}
            </div>
          ))}


          {result.averageBreakdown && (
            <div className="flex flex-1 flex-col mt-6">
              <div className="text-lg font-bold mb-2 text-muted-foreground align-center text-white">
                Average Damage Composition
              </div>
              <AverageDamagePie data={result.averageBreakdown} />
            </div>
          )}
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        <button
          onClick={toggleFormula}
          className="
            w-full rounded-xl px-3 py-2 text-sm font-medium
            bg-zinc-500/10 text-zinc-300
            border border-white/10
            hover:bg-zinc-500/20
          "
        >
          {showFormula ? "Hide Formula" : "Show Formula"}
        </button>

        {showFormula && formulaSlot}

        {warnings.map((w, i) => (
          <Badge
            key={i}
            className="bg-red-500/15 text-red-400 border border-red-500/30"
          >
            {w}
          </Badge>
        ))}

        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ArrowUpRight size={14} />
          Auto update · Min–Max formula
        </div>
      </CardContent>
    </Card>
  );
}
