// app/ui/DamagePanel.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Zap, ArrowUpRight } from "lucide-react";
import { DamageResult } from "../../domain/damage/type";
import AverageDamagePie from "./AverageDamagePie";
import RotationDamagePie from "./RotationDamagePie";
import { DamageContext } from "@/app/domain/damage/damageContext";
import FinalStatPanel from "./FinalStatPanel";
import { buildFinalStatSections } from "@/app/domain/damage/buildFinalStatSections";
import { useSkillDamage } from "@/app/hooks/useSkillDamage";
import { SKILLS } from "@/app/domain/skill/skills";
import { ElementStats, Rotation } from "@/app/types";
import { SkillDamagePanel } from "./SkillDamagePanel";
import { Skill } from "@/app/domain/skill/types";
import { useI18n } from "@/app/providers/I18nProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  ctx: DamageContext;
  result: DamageResult;

  showFormula: boolean;
  toggleFormula: () => void;
  formulaSlot?: React.ReactNode;
  warnings?: string[];
  elementStats?: ElementStats;
  rotation?: Rotation;
}

export default function DamagePanel({
  ctx,
  result,
  showFormula,
  toggleFormula,
  formulaSlot,
  elementStats,
  rotation,
  warnings = [],
}: Props) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      stats: "Chỉ số",
      damageOutput: "Kết quả sát thương",
      averageDamageComposition: "Thành phần sát thương trung bình",
      rotationDamageBreakdown: "Phân rã sát thương rotation",
      hideFormula: "Ẩn công thức",
      showFormula: "Hiện công thức",
      autoUpdate: "Tự động cập nhật · Công thức Min–Max",
    }
    : {
      stats: "Stats",
      damageOutput: "Damage output",
      averageDamageComposition: "Average Damage Composition",
      rotationDamageBreakdown: "Rotation Damage Breakdown",
      hideFormula: "Hide Formula",
      showFormula: "Show Formula",
      autoUpdate: "Auto update · Min–Max formula",
    };

  const finalStats = buildFinalStatSections(ctx);
  const selectedMartialArtId = elementStats?.martialArtsId;

  const baseSkills = SKILLS.filter((skill) => {
    // Universal skills (no martialArtId) should always be visible.
    if (!skill.martialArtId) return true;

    if (selectedMartialArtId) return skill.martialArtId === selectedMartialArtId;
    if (elementStats?.selected) return skill.martialArtId.includes(elementStats.selected);
    return true;
  });

  // If we are using a rotation (e.g. in gear optimize), ensure any skills referenced
  // by the rotation are included in the breakdown even if they don't match the
  // current martial-art filter (this is important for mystic skills).
  const skillById = new Map(baseSkills.map((s) => [s.id, s] as const));
  if (rotation?.skills?.length) {
    for (const entry of rotation.skills) {
      const s = SKILLS.find((x) => x.id === entry.id);
      if (s) skillById.set(s.id, s);
    }
  }

  const skills = Array.from(skillById.values());

  const skillDamages = useSkillDamage(ctx, skills);
  const completedSkillDamages = skillDamages.filter(
    (entry): entry is { skill: Skill; result: NonNullable<typeof entry.result> } =>
      Boolean(entry.result)
  );

  // get from CategorySkill type
  const categoryOrder: Skill["category"][] = [
    "martial-art-skill",
    "special-skill",
    "dual-weapon-skill",
    "basic",
    "ultimate",
    "mystic-skill",
  ];

  const categoryLabels: Record<Skill["category"], string> = {
    "martial-art-skill": language === "vi" ? "Kỹ năng võ học" : "Martial Art Skill",
    "special-skill": language === "vi" ? "Kỹ năng đặc biệt" : "Special Skill",
    "dual-weapon-skill": language === "vi" ? "Kỹ năng song vũ khí" : "Dual-Weapon Skill",
    basic: language === "vi" ? "Cơ bản" : "Basic",
    ultimate: language === "vi" ? "Tối thượng" : "Ultimate",
    "mystic-skill": language === "vi" ? "Kỹ năng huyền thuật" : "Mystic Skill",
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
          flex-1 overflow-y-auto space-y-4 p-3 sm:space-y-6 sm:p-4 lg:p-5
          scrollbar-thin scrollbar-thumb-zinc-600/40
        "
      >
        <div className="flex flex-col">
          <div className="pb-3 text-base font-bold sm:pb-4 sm:text-lg">{text.stats}</div>

          <FinalStatPanel sections={finalStats} ctx={ctx} />

          <div className="flex flex-row gap-x-2 pt-3 text-base font-bold sm:pt-4 sm:text-lg">
            <Zap className="text-yellow-500" /> {text.damageOutput}
          </div>

          {groupedSkillDamages.map((group) => (
            <div key={group.category}>
              <div className="text-lg pt-6 px-2 font-semibold text-foreground tracking-wide capitalize">
                {categoryLabels[group.category]}
              </div>

              {group.skills.map(({ skill, result }, idx) => (
                <SkillDamagePanel
                  key={skill.id}
                  skill={skill}
                  result={result}
                  ctx={ctx}
                  showHeader={idx === 0}
                  isEven={idx % 2 === 1}
                />
              ))}
            </div>
          ))}


          {result.averageBreakdown && (
            <div className="flex flex-1 flex-col mt-6">
              <div className="text-lg font-bold mb-2 text-foreground align-center">
                {text.averageDamageComposition}
              </div>
              <AverageDamagePie data={result.averageBreakdown} />
            </div>
          )}

          {rotation && rotation.skills.length > 0 && (
            <div className="flex flex-1 flex-col mt-6">
              <div className="text-lg font-bold mb-2 text-foreground align-center">
                {text.rotationDamageBreakdown}
              </div>
              <RotationDamagePie rotation={rotation} ctx={ctx} />
            </div>
          )}
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        <button
          onClick={toggleFormula}
          className="
            w-full rounded-xl px-3 py-2 text-sm font-medium
            bg-secondary text-secondary-foreground
            border border-border
            hover:bg-secondary/80
          "
        >
          {showFormula ? text.hideFormula : text.showFormula}
        </button>

        <Dialog open={showFormula} onOpenChange={() => toggleFormula()}>
          <DialogContent className="w-auto max-w-[95vw] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            {formulaSlot}
          </DialogContent>
        </Dialog>

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
          {text.autoUpdate}
        </div>
      </CardContent>
    </Card>
  );
}
