import { DamageContext } from "@/app/domain/damage/damageContext";
import { FinalStatSection } from "./type";

const pctNotPercent = (v: number) => `${v.toFixed(1)}`;
const pct = (v: number) => `${v.toFixed(1)}%`;

export function buildFinalStatSections(ctx: DamageContext): FinalStatSection[] {
  return [
    {
      title: "Combat Attributes",
      rows: [
        {
          label: "Physical Attack",
          value: `${pctNotPercent(
            ctx.get("MinPhysicalAttack")
          )} – ${pctNotPercent(ctx.get("MaxPhysicalAttack"))}`,
          highlight: true,
        },
        {
          label: "Physical Defense",
          value: `${pctNotPercent(ctx.get("PhysicalDefense"))}`,
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
          label: "Attribute Attack",
          value: `${ctx.get("MINAttributeAttackOfYOURType")} – ${ctx.get(
            "MAXAttributeAttackOfYOURType"
          )}`,
        },
        {
          label: "Attribute Penetration",
          value: `${ctx.get("AttributeAttackPenetrationOfYOURType")}`,
        },
      ],
    },
  ];
}
