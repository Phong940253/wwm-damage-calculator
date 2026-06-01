import { DamageContext } from "@/app/domain/damage/damageContext";
import { FinalStatSection } from "./type";
import { STAT_LABELS } from "@/app/constants";

const pctNP = (v: number) => `${v.toFixed(1)}`;
const pct = (v: number) => `${v.toFixed(1)}%`;

const SPECIAL_STAT_KEYS = [
  "DamageBoost",
  "CombatBoostAgainstBossUnits",
  "MartialArtSkillDamageBoost",
  "AllMartialArtsBoost",
  "ChargeSkillDamageBoost",
  "BallisticSkillDamageBoost",
  "PursuitSkillDamageBoost",
  "SpringAwayDamageBoost",
  "UmbrellaBallisticCriticalDMGBonus",
  "MoonlitShatterSpringPursuitCriticalDMGBonus",
  "ArtOfSwordDMGBoost",
  "ArtOfSpearDMGBoost",
  "ArtOfFanDMGBoost",
  "ArtOfUmbrellaDMGBoost",
  "ArtOfHorizontalBladeDMGBoost",
  "ArtOfMoBladeDMGBoost",
  "ArtOfDualBladesDMGBoost",
  "ArtOfRopeDartDMGBoost",
  "SoulshadeUmbrellaSpinningUmbrellaDMGBoost",
  "NamelessSwordMartialArtSkillDMGBoost",
  "NamelessSwordChargedSkillDMGBoost",
  "NamelessSwordSpecialSkillDMGBoost",
  "NamelessSpearMartialArtSkillDMGBoost",
  "NamelessSpearChargedSkillDMGBoost",
  "NamelessSpearSpecialSkillDMGBoost",
  "VernalUmbrellaMartialArtSkillDMGBoost",
  "VernalUmbrellaChargedSkillDMGBoost",
  "VernalUmbrellaSpecialSkillDMGBoost",
  "InkwellFanMartialArtSkillDMGBoost",
  "InkwellFanChargedSkillDMGBoost",
  "InkwellFanSpecialAndPursuitSkillDMGBoost",
  "InfernalTwinbladesMartialArtSkillDMGBoost",
  "InfernalTwinbladesSpecialSkillDMGBoost",
  "InfernalTwinbladesEmpoweredLightAttackDMGBoost",
  "MortalRopeDartMartialArtSkillDMGBoost",
  "MortalRopeDartChargedSkillDMGBoost",
  "MortalRopeDartRodentDMGBoost",
  "UnfetteredRopeDartMartialArtSkillDMGBoost",
  "UnfetteredRopeDartChargedSkillDMGBoost",
  "UnfetteredRopeDartSpecialSkillDMGBoost",
  "StrategicSwordMartialArtSkillDMGBoost",
  "StrategicSwordChargedSkillDMGBoost",
  "StrategicSwordSpecialSkillDMGBoost",
  "HeavenquakerSpearMartialArtSkillDMGBoost",
  "HeavenquakerSpearChargedSkillDMGBoost",
  "HeavenquakerSpearSpecialSkillDMGBoost",
  "ThundercryBladeChargedSkillDMGBoost",
  "ThundercryBladeSpecialSkillDMGBoost",
  "StormbreakerSpearMartialArtSkillDMGBoost",
  "StormbreakerSpearChargedSkillDMGBoost",
  "StormbreakerSpearSpecialSkillDMGBoost",
  "EverspringUmbrellaMartialArtSkillDMGBoost",
  "EverspringUmbrellaChargedSkillDMGBoost",
  "EverspringUmbrellaSpecialSkillDMGBoost",
  "PanaceaFanMartialArtSkillHealingBoost",
  "PanaceaFanSpecialSkillHealingBoost",
  "SoulshadeUmbrellaMartialArtSkillHealingBoost",
  "SoulshadeUmbrellaSpecialSkillHealingBoost",
  "SoulshadeUmbrellaChargedSkillDMGBoost",
];

export function buildFinalStatSections(ctx: DamageContext): FinalStatSection[] {
  const hiddenRows = SPECIAL_STAT_KEYS.map((key) => {
    const val = ctx.get(key);
    if (val <= 0) return null;
    return {
      label: STAT_LABELS[key] || key,
      value: pct(val),
      ctxKeys: [key],
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return [
    {
      title: "Combat Attributes",
      rows: [
        {
          label: "Physical Attack",
          value: `${pctNP(ctx.get("MinPhysicalAttack"))} – ${pctNP(
            ctx.get("MaxPhysicalAttack"),
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
          value: `${pct(ctx.get("CriticalRate"))} → ${pct(
            ctx.get("FinalCriticalRate"),
          )}`,
          ctxKeys: ["CriticalRate", "FinalCriticalRate"],
        },
        {
          label: "Affinity Rate",
          value: `${pct(ctx.get("AffinityRate"))} → ${pct(
            ctx.get("FinalAffinityRate"),
          )}`,
          ctxKeys: ["AffinityRate", "FinalAffinityRate"],
        },
        {
          label: "Total Rate",
          value: pct(
            ctx.get("FinalCriticalRate") + ctx.get("FinalAffinityRate"),
          ),
          highlight: true,
          ctxKeys: ["FinalCriticalRate", "FinalAffinityRate"],
        },
      ],
    },
    {
      title: "Attribute Effect",
      rows: [
        {
          label: "Main Attribute Attack",
          value: `${pctNP(ctx.get("MINAttributeAttackOfYOURType"))} – ${pctNP(
            ctx.get("MAXAttributeAttackOfYOURType"),
          )}`,
          ctxKeys: [
            "MINAttributeAttackOfYOURType",
            "MAXAttributeAttackOfYOURType",
          ],
        },
        {
          label: "Other Attribute Attack",
          value: `${pctNP(ctx.get("MINAttributeAttackOfOtherType"))} – ${pctNP(
            ctx.get("MAXAttributeAttackOfOtherType"),
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
      rows: hiddenRows,
    },
  ].filter((s) => s.rows.length > 0);
}

