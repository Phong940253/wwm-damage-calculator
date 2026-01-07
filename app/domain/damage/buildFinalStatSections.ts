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
        },
        {
          label: "Physical Defense",
          value: `${pctNP(ctx.get("PhysicalDefense"))}`,
        },
      ],
    },
    {
      title: "Attribute to Check",
      rows: [
        {
          label: "Precision Rate",
          value: pct(ctx.get("PrecisionRate")),
        },
        {
          label: "Critical Rate",
          value: pct(ctx.get("CriticalRate")),
        },
        {
          label: "Affinity Rate",
          value: pct(ctx.get("AffinityRate")),
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
        },
        {
          label: "Other Attribute Attack",
          value: `${pctNP(ctx.get("MINAttributeAttackOfOtherType"))} – ${pctNP(
            ctx.get("MAXAttributeAttackOfOtherType")
          )}`,
        },
      ],
    },
    {
      title: "Special Attribute",
      rows: [
        {
          label: "Crit DMG Bonus",
          value: pct(ctx.get("CriticalDMGBonus")),
        },
        {
          label: "Affinity DMG Bonus",
          value: pct(ctx.get("AffinityDMGBonus")),
        },
        {
          label: "Physical Penetration",
          value: pctNP(ctx.get("PhysicalPenetration")),
        },
        {
          label: "Physical Resistance",
          value: pctNP(ctx.get("PhysicalResistance")),
        },
        {
          label: "Attribute Attack Penetration",
          value: pctNP(ctx.get("AttributeAttackPenetrationOfYOURType")),
        },
        {
          label: "Physical DMG Bonus",
          value: pct(ctx.get("PhysicalDMGBonus")),
        },
        {
          label: "Physical DMG Reduction",
          value: pct(ctx.get("PhysicalDMGReduction")),
        },
        {
          label: "Attribute Attack DMG Bonus",
          value: pct(ctx.get("AttributeAttackDMGBonusOfYOURType")),
        },
        {
          label: "Damage Boost",
          value: pct(ctx.get("DamageBoost")),
        },
      ],
    },
  ];
}
