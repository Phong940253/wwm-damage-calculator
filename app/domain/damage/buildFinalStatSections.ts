import { DamageContext } from "@/app/domain/damage/damageContext";
import { FinalStatSection } from "./type";

const pctNP = (v: number) => `${v.toFixed(1)}`;
const pct = (v: number) => `${v.toFixed(1)}%`;

export function buildFinalStatSections(ctx: DamageContext): FinalStatSection[] {
  return [
    {
      title: "Combat Attributes",
      rows: [
        {
          label: "Physical Attack",
          value: `${pctNP(ctx.get("MinPhysicalAttack"))} – ${pctNP(
            ctx.get("MaxPhysicalAttack")
          )}`,
          highlight: true,
          ctxKeys: ["MinPhysicalAttack", "MaxPhysicalAttack"],
        },
        {
          label: "Physical Defense",
          value: `${pctNP(ctx.get("PhysicalDefense"))}`,
          ctxKeys: ["PhysicalDefense"],
        },
      ],
    },
    {
      title: "Attribute to Check",
      rows: [
        {
          label: "Precision Rate",
          value: pct(ctx.get("PrecisionRate")),
          ctxKeys: ["PrecisionRate"],
        },
        {
          label: "Critical Rate",
          value: pct(ctx.get("CriticalRate")),
          ctxKeys: ["CriticalRate"],
        },
        {
          label: "Affinity Rate",
          value: pct(ctx.get("AffinityRate")),
          ctxKeys: ["AffinityRate"],
        },
      ],
    },
    {
      title: "Attribute Effect",
      rows: [
        {
          label: "Main Attribute Attack",
          value: `${pctNP(ctx.get("MINAttributeAttackOfYOURType"))} – ${pctNP(
            ctx.get("MAXAttributeAttackOfYOURType")
          )}`,
          ctxKeys: [
            "MINAttributeAttackOfYOURType",
            "MAXAttributeAttackOfYOURType",
          ],
        },
        {
          label: "Other Attribute Attack",
          value: `${pctNP(ctx.get("MINAttributeAttackOfOtherType"))} – ${pctNP(
            ctx.get("MAXAttributeAttackOfOtherType")
          )}`,
          ctxKeys: [
            "MINAttributeAttackOfOtherType",
            "MAXAttributeAttackOfOtherType",
          ],
        },
      ],
    },
    {
      title: "Special Attribute",
      rows: [
        {
          label: "Crit DMG Bonus",
          value: pct(ctx.get("CriticalDMGBonus")),
          ctxKeys: ["CriticalDMGBonus"],
        },
        {
          label: "Affinity DMG Bonus",
          value: pct(ctx.get("AffinityDMGBonus")),
          ctxKeys: ["AffinityDMGBonus"],
        },
        {
          label: "Physical Penetration",
          value: pctNP(ctx.get("PhysicalPenetration")),
          ctxKeys: ["PhysicalPenetration"],
        },
        {
          label: "Physical Resistance",
          value: pctNP(ctx.get("PhysicalResistance")),
          ctxKeys: ["PhysicalResistance"],
        },
        {
          label: "Attribute Attack Penetration",
          value: pctNP(ctx.get("AttributeAttackPenetrationOfYOURType")),
          ctxKeys: ["AttributeAttackPenetrationOfYOURType"],
        },
        {
          label: "Physical DMG Bonus",
          value: pct(ctx.get("PhysicalDMGBonus")),
          ctxKeys: ["PhysicalDMGBonus"],
        },
        {
          label: "Physical DMG Reduction",
          value: pct(ctx.get("PhysicalDMGReduction")),
          ctxKeys: ["PhysicalDMGReduction"],
        },
        {
          label: "Attribute Attack DMG Bonus",
          value: pct(ctx.get("AttributeAttackDMGBonusOfYOURType")),
          ctxKeys: ["AttributeAttackDMGBonusOfYOURType"],
        },
      ],
    },
    {
      title: "Hidden Stats",
      rows: [
        {
          label: "Charge Skill DMG Boost",
          value: pct(ctx.get("ChargeSkillDamageBoost")),
          ctxKeys: ["ChargeSkillDamageBoost"],
        },

        {
          label: "Damage Boost",
          value: pct(ctx.get("DamageBoost")),
          ctxKeys: ["DamageBoost"],
        },
      ],
    },
  ];
}
