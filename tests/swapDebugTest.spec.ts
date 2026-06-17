import { describe, it, expect } from "vitest";
import { computeOptimizeResultsAsync } from "@/app/domain/gear/gearOptimize";
import type { CustomGear, InputStats, ElementStats } from "@/app/types";

const gearData: CustomGear[] = [
  { id: "7ffe936b-cc04-4319-99f2-b634aba875f3", name: "Swiftwing Glow Sword", slot: "weapon_1", weaponType: "sword" as any, level: 91, mains: [{ stat: "MinPhysicalAttack", value: 53 }, { stat: "MaxPhysicalAttack", value: 124 }], subs: [{ stat: "Momentum", value: 35.1 }, { stat: "bellstrikeMax", value: 35.7 }, { stat: "MaxPhysicalAttack", value: 60.5 }, { stat: "AffinityRate", value: 3.5 }, { stat: "Momentum", value: 36.5 }], addition: { stat: "PhysicalPenetration", value: 8.9 }, tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "MaxPhysicalAttack" }] },
  { id: "292d174c-205a-482a-ad64-891fd522cbfd", name: "Swiftwing Pendant", slot: "pendant", level: 91, mains: [{ stat: "MaxPhysicalAttack", value: 106 }], subs: [{ stat: "MaxPhysicalAttack", value: 63.6 }, { stat: "CriticalRate", value: 7.4 }, { stat: "MaxPhysicalAttack", value: 61 }, { stat: "stonesplitMin", value: 34.2 }, { stat: "bellstrikeMax", value: 35.2 }], addition: { stat: "PhysicalPenetration", value: 8.8 }, tunedSubIndex: 1, tuneHistory: [{ subIndex: 1, stat: "CriticalRate" }] },
  { id: "6da78ac1-9fcb-45ae-95b9-d46adcbabc0f", name: "Golden Scale Feathered Spear", slot: "weapon_2", weaponType: "spear" as any, level: 91, mains: [{ stat: "MinPhysicalAttack", value: 53 }, { stat: "MaxPhysicalAttack", value: 124 }], subs: [{ stat: "Momentum", value: 37.3 }, { stat: "MaxPhysicalAttack", value: 60 }, { stat: "bamboocutMin", value: 33.9 }, { stat: "CriticalRate", value: 7 }, { stat: "PrecisionRate", value: 6.2 }], addition: { stat: "PhysicalPenetration", value: 8.8 }, tunedSubIndex: 3, tuneHistory: [{ subIndex: 3, stat: "CriticalRate" }] },
  { id: "4cfa6afd-1ddb-427a-b13a-1c60bdf0dd73", name: "Swiftwing Charm", slot: "disc", level: 91, mains: [{ stat: "MinPhysicalAttack", value: 71 }], subs: [{ stat: "MaxPhysicalAttack", value: 46.8 }, { stat: "Momentum", value: 39.6 }, { stat: "bamboocutMin", value: 34.9 }, { stat: "stonesplitMin", value: 33.7 }, { stat: "CriticalRate", value: 7.4 }], addition: { stat: "PhysicalPenetration", value: 8.8 }, tunedSubIndex: 4, tuneHistory: [{ subIndex: 4, stat: "CriticalRate" }] },
  { id: "c455d510-9345-48a7-ad08-b73be0ba36ff", name: "Frontiermoon Crown", slot: "head", level: 91, mains: [{ stat: "HP", value: 4614 }, { stat: "Defense", value: 18 }], subs: [{ stat: "AffinityRate", value: 3.4 }, { stat: "AffinityRate", value: 3.4 }, { stat: "Power", value: 38 }, { stat: "MaxPhysicalAttack", value: 60 }, { stat: "bellstrikeMax", value: 34 }], addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 5 }, tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "Power" }, { subIndex: 2, stat: "bellstrikeMax" }, { subIndex: 2, stat: "CriticalRate" }, { subIndex: 2, stat: "MaxPhysicalAttack" }, { subIndex: 2, stat: "Momentum" }, { subIndex: 2, stat: "AffinityRate" }] },
  { id: "90567661-0f8e-4c52-9db6-e475bca73416", name: "Nightfarer Bracers", slot: "hand", level: 91, mains: [{ stat: "HP", value: 4153 }, { stat: "Defense", value: 16 }], subs: [{ stat: "AffinityRate", value: 2.6 }, { stat: "MaxPhysicalAttack", value: 63.8 }, { stat: "PrecisionRate", value: 6.2 }, { stat: "CriticalRate", value: 7.4 }, { stat: "AffinityRate", value: 3.6 }], addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 5 }, tunedSubIndex: 1, tuneHistory: [{ subIndex: 1, stat: "MaxPhysicalAttack" }, { subIndex: 1, stat: "bellstrikeMax" }] },
  { id: "88129bc6-96b4-4dc9-8577-8a78651e4276", name: "Swiftwing Pendant", slot: "pendant", level: 91, mains: [{ stat: "MaxPhysicalAttack", value: 106 }], subs: [{ stat: "MaxPhysicalAttack", value: 49.7 }, { stat: "AffinityRate", value: 3.6 }, { stat: "MaxPhysicalAttack", value: 60.8 }, { stat: "bamboocutMin", value: 36.2 }, { stat: "Momentum", value: 40.2 }], addition: { stat: "PhysicalPenetration", value: 9 }, tunedSubIndex: 4, tuneHistory: [{ subIndex: 4, stat: "CriticalRate" }, { subIndex: 4, stat: "bellstrikeMax" }, { subIndex: 4, stat: "Momentum" }] },
  { id: "0ae8dbdf-61a5-4b89-a954-1a4429678526", name: "Swiftwing Feathered Spear", slot: "weapon_2", weaponType: "spear" as any, level: 91, mains: [{ stat: "MinPhysicalAttack", value: 53 }, { stat: "MaxPhysicalAttack", value: 124 }], subs: [{ stat: "bellstrikeMax", value: 29.7 }, { stat: "CriticalRate", value: 5.5 }, { stat: "MaxPhysicalAttack", value: 63.8 }, { stat: "AffinityRate", value: 3.1 }, { stat: "Momentum", value: 38.1 }], addition: { stat: "PhysicalPenetration", value: 8.8 }, tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "MaxPhysicalAttack", value: 63.8 }] },
  { id: "290d3d4d-09de-4093-b091-dedd6d499573", name: "Swiftwing Glow Sword", slot: "weapon_1", weaponType: "sword" as any, level: 91, mains: [{ stat: "MinPhysicalAttack", value: 53 }, { stat: "MaxPhysicalAttack", value: 124 }], subs: [{ stat: "bellstrikeMax", value: 28.4 }, { stat: "Momentum", value: 38.1 }, { stat: "stonesplitMin", value: 35 }, { stat: "ArtOfSwordDMGBoost", value: 5.1 }, { stat: "AffinityRate", value: 3.5 }], addition: { stat: "PhysicalPenetration", value: 8.9 }, tunedSubIndex: 1, tuneHistory: [{ subIndex: 1, stat: "Momentum" }] },
  { id: "d5656175-579e-47c2-9061-fee83e713101", name: "Swiftwing Feathered Spear", slot: "weapon_2", weaponType: "spear" as any, mains: [{ stat: "MinPhysicalAttack", value: 53 }, { stat: "MaxPhysicalAttack", value: 124 }], subs: [{ stat: "Momentum", value: 32 }, { stat: "CriticalRate", value: 7.4 }, { stat: "bellstrikeMax", value: 34.6 }, { stat: "MaxPhysicalAttack", value: 59.4 }, { stat: "Momentum", value: 39.5 }], addition: { stat: "PhysicalPenetration", value: 8.8 }, tunedSubIndex: 1, rarity: "Tier 91" as any },
  { id: "473510b0-557b-4f92-b55b-b889acfa9df7", name: "Nightfarer Night Leg Armor", slot: "leg", level: 91, mains: [{ stat: "HP", value: 4153 }, { stat: "Defense", value: 32 }], subs: [{ stat: "AffinityRate", value: 2.3 }, { stat: "AffinityRate", value: 3.3 }, { stat: "bellstrikeMax", value: 36.2 }, { stat: "PrecisionRate", value: 6.1 }, { stat: "CombatBoostAgainstBossUnits", value: 2.6 }], addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 4.7 }, tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "bellstrikeMax" }] },
  { id: "248d01cd-27ec-4638-a59e-2c0e469e5a5e", name: "Nightfarer Armor", slot: "chest", level: 91, mains: [{ stat: "HP", value: 8305 }, { stat: "Defense", value: 16 }], subs: [{ stat: "CriticalRate", value: 7.4 }, { stat: "bellstrikeMax", value: 36.2 }, { stat: "silkbindMin", value: 33.7 }, { stat: "MaxPhysicalAttack", value: 62.6 }, { stat: "CriticalRate", value: 7.4 }], addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 4.7 }, tunedSubIndex: 1, tuneHistory: [{ subIndex: 1, stat: "AffinityRate" }, { subIndex: 1, stat: "bellstrikeMax" }] },
  { id: "a67922e1-0d03-4572-b75f-873cfda3c5d6", name: "Swiftwing Charm", slot: "disc", level: 91, mains: [{ stat: "MinPhysicalAttack", value: 71 }], subs: [{ stat: "MaxPhysicalAttack", value: 63.1 }, { stat: "Momentum", value: 37.1 }, { stat: "MaxPhysicalAttack", value: 63.8 }, { stat: "stonesplitMin", value: 36.2 }, { stat: "CriticalRate", value: 7.4 }], addition: { stat: "PhysicalPenetration", value: 8.8 }, tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "MaxPhysicalAttack" }] },
  { id: "0c387b2d-453f-4ef3-939c-5ed0618e41dc", name: "Swiftwing Charm", slot: "disc", level: 91, mains: [{ stat: "MinPhysicalAttack", value: 71 }], subs: [{ stat: "MaxPhysicalAttack", value: 51.5 }, { stat: "bamboocutMin", value: 35.9 }, { stat: "AffinityRate", value: 3.3 }, { stat: "AllMartialArtsBoost", value: 2.5 }, { stat: "MaxPhysicalAttack", value: 63.8 }], addition: { stat: "PhysicalPenetration", value: 8.8 }, tunedSubIndex: 4, tuneHistory: [{ subIndex: 4, stat: "MaxPhysicalAttack" }] },
  { id: "33f1e1d4-11e5-4295-9756-91d623717f36", name: "Frontiermoon Leg Armor", slot: "leg", level: 91, mains: [{ stat: "HP", value: 4614 }, { stat: "Defense", value: 36 }], subs: [{ stat: "AffinityRate", value: 3.4 }, { stat: "CombatBoostAgainstBossUnits", value: 2.4 }, { stat: "Momentum", value: 38 }, { stat: "stonesplitMin", value: 34 }, { stat: "MaxPhysicalAttack", value: 60 }], addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 4.9 }, tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "bellstrikeMax" }, { subIndex: 2, stat: "CriticalRate" }, { subIndex: 2, stat: "AffinityRate" }, { subIndex: 2, stat: "Power" }, { subIndex: 2, stat: "Momentum" }] },
  { id: "23f3c7b9-15e2-4760-90c8-29746d8eb0dd", name: "Test 1", slot: "leg", level: 91, mains: [{ stat: "HP", value: 0 }, { stat: "Defense", value: 0 }], subs: [{ stat: "CriticalRate", value: 7.098 }, { stat: "AffinityRate", value: 3.276 }, { stat: "CriticalRate", value: 7.098 }, { stat: "Momentum", value: 37.128 }, { stat: "Power", value: 37.128 }], addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 4.7 }, tunedSubIndex: null, tuneHistory: [] },
  { id: "5d1149c8-f107-46fb-8c06-94143ca07715", name: "Swiftwing Pendant", slot: "pendant", level: 91, mains: [{ stat: "MaxPhysicalAttack", value: 106 }], subs: [{ stat: "MaxPhysicalAttack", value: 48.1 }, { stat: "AffinityRate", value: 3.6 }, { stat: "Momentum", value: 40.4 }, { stat: "stonesplitMin", value: 36.2 }, { stat: "MaxPhysicalAttack", value: 63.8 }], addition: { stat: "PhysicalPenetration", value: 8 }, tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "Momentum" }] },
  { id: "c4cd703f-7a87-442e-a703-b8fbfa578e44", name: "Vanguard Veilbright", slot: "weapon_1", weaponType: "sword" as any, level: 91, mains: [{ stat: "MinPhysicalAttack", value: 53 }, { stat: "MaxPhysicalAttack", value: 124 }], subs: [{ stat: "MaxPhysicalAttack", value: 47.4 }, { stat: "MaxPhysicalAttack", value: 60.2 }, { stat: "MinPhysicalAttack", value: 63.8 }, { stat: "stonesplitMin", value: 34.3 }, { stat: "bellstrikeMax", value: 33 }], addition: { stat: "PhysicalPenetration", value: 8.9 }, tunedSubIndex: null, tuneHistory: [] },
  { id: "c30eebf0-04c0-483d-833e-efef73e9d615", name: "Vanguard Ward", slot: "pendant", level: 91, mains: [{ stat: "MaxPhysicalAttack", value: 106 }], subs: [{ stat: "MaxPhysicalAttack", value: 47.3 }, { stat: "MaxPhysicalAttack", value: 61 }, { stat: "AffinityRate", value: 3.5 }, { stat: "PrecisionRate", value: 6.5 }, { stat: "Agility", value: 38.7 }], addition: { stat: "PhysicalPenetration", value: 9 }, tunedSubIndex: null, tuneHistory: [] },
  { id: "1e598949-33fc-4bd6-9938-93d609cebd34", name: "Nightfarer Bracers", slot: "hand", level: 91, mains: [{ stat: "HP", value: 4614 }, { stat: "Defense", value: 18 }], subs: [{ stat: "AffinityRate", value: 3.1 }, { stat: "Momentum", value: 39.2 }, { stat: "AffinityRate", value: 3.6 }, { stat: "silkbindMin", value: 32.7 }, { stat: "stonesplitMin", value: 33.1 }], addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 5 }, tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "AffinityRate" }] },
];

const stats: InputStats = {
  HP: { current: 62905, increase: 0 }, MinPhysicalAttack: { current: 565.2, increase: 0 },
  MaxPhysicalAttack: { current: 1159.32, increase: 0 }, PhysicalAttackMultiplier: { current: 100, increase: 0 },
  FlatDamage: { current: 378, increase: 0 }, PrecisionRate: { current: 94, increase: 0 },
  CriticalRate: { current: 19.988, increase: 0 }, DirectCriticalRate: { current: 0, increase: 0 },
  CriticalDMGBonus: { current: 50, increase: 0 }, AffinityRate: { current: 15.47, increase: 0 },
  DirectAffinityRate: { current: 0, increase: 0 }, AffinityDMGBonus: { current: 35, increase: 0 },
  DamageBoost: { current: 0, increase: 0 }, CombatBoostAgainstBossUnits: { current: 0, increase: 0 },
  MartialArtSkillDamageBoost: { current: 0, increase: 0 }, AllMartialArtsBoost: { current: 0, increase: 0 },
  ChargeSkillDamageBoost: { current: 0, increase: 0 }, BallisticSkillDamageBoost: { current: 0, increase: 0 },
  PursuitSkillDamageBoost: { current: 0, increase: 0 }, MoonlitShatterSpringPursuitCriticalDMGBonus: { current: 0, increase: 0 },
  ArtOfSwordDMGBoost: { current: 0, increase: 0 }, ArtOfSpearDMGBoost: { current: 0, increase: 0 },
  ArtOfFanDMGBoost: { current: 0, increase: 0 }, ArtOfUmbrellaDMGBoost: { current: 0, increase: 0 },
  ArtOfHorizontalBladeDMGBoost: { current: 0, increase: 0 }, ArtOfMoBladeDMGBoost: { current: 0, increase: 0 },
  ArtOfDualBladesDMGBoost: { current: 0, increase: 0 }, ArtOfRopeDartDMGBoost: { current: 0, increase: 0 },
  SoulshadeUmbrellaSpinningUmbrellaDMGBoost: { current: 0, increase: 0 },
  PhysicalDefense: { current: 232, increase: 0 }, PhysicalResistance: { current: 0, increase: 0 },
  PhysicalDMGBonus: { current: 0, increase: 0 }, PhysicalDMGReduction: { current: 0, increase: 0 },
  PhysicalPenetration: { current: 0, increase: 0 }, Body: { current: 137, increase: 0 },
  Power: { current: 137, increase: 0 }, Defense: { current: 51, increase: 0 },
  Agility: { current: 137, increase: 0 }, Momentum: { current: 137.4, increase: 0 },
};

const elementStats: ElementStats = {
  selected: "bellstrike", martialArtsId: "bellstrike_splendor",
  MainElementMultiplier: { current: 100, increase: 0 },
  bellstrikeMin: { current: 286, increase: 0 }, bellstrikeMax: { current: 573, increase: 0 },
  bellstrikePenetration: { current: 24, increase: 0 }, bellstrikeDMGBonus: { current: 9, increase: 0 },
  stonesplitMin: { current: 0, increase: 0 }, stonesplitMax: { current: 0, increase: 0 },
  stonesplitPenetration: { current: 0, increase: 0 }, stonesplitDMGBonus: { current: 0, increase: 0 },
  silkbindMin: { current: 0, increase: 0 }, silkbindMax: { current: 0, increase: 0 },
  silkbindPenetration: { current: 0, increase: 0 }, silkbindDMGBonus: { current: 0, increase: 0 },
  bamboocutMin: { current: 0, increase: 0 }, bamboocutMax: { current: 0, increase: 0 },
  bamboocutPenetration: { current: 0, increase: 0 }, bamboocutDMGBonus: { current: 0, increase: 0 },
};

const equipped: Partial<Record<string, string>> = {
  weapon_2: "d5656175-579e-47c2-9061-fee83e713101",
  disc: "0c387b2d-453f-4ef3-939c-5ed0618e41dc",
  head: "c455d510-9345-48a7-ad08-b73be0ba36ff",
  weapon_1: "290d3d4d-09de-4093-b091-dedd6d499573",
  chest: "248d01cd-27ec-4638-a59e-2c0e469e5a5e",
  pendant: "88129bc6-96b4-4dc9-8577-8a78651e4276",
  hand: "90567661-0f8e-4c52-9db6-e475bca73416",
  leg: "33f1e1d4-11e5-4295-9756-91d623717f36",
};

describe("User data: swap variant debug", () => {
  it("PENDANT ONLY — should show swap variants in results", async () => {
    const r = await computeOptimizeResultsAsync(
      stats as any, elementStats as any, gearData, equipped, 10, undefined, undefined,
      {
        candidateGears: gearData,
        slotsToOptimize: ["pendant"] as any,
        considerTune: true,
        autoReduceIfOverCombos: 1,
        reduceTargetCombos: 200000,
        reducePerSlotCap: 0,
      },
    );

    const hasSwapInResults = r.results.some((res: any) =>
      Object.values(res.selection).some((g: any) => g?.__tuneId?.startsWith("::swap::"))
    );

    console.log("PENDANT ONLY — baseDamage:", r.baseDamage);
    console.log("PENDANT ONLY — totalCombos:", r.totalCombos);
    console.log("PENDANT ONLY — results count:", r.results.length);
    console.log("PENDANT ONLY — hasSwapInResults:", hasSwapInResults);
    console.log("PENDANT ONLY — results with swap:", r.results.filter((res: any) =>
      Object.values(res.selection).some((g: any) => g?.__tuneId?.startsWith("::swap::"))
    ).length);

    // Check selection[pendant] __tuneId
    r.results.forEach((res: any, i: number) => {
      const g = res.selection["pendant"];
      console.log(`  result ${i}: dmg=${res.damage.toFixed(1)} name=${g?.name} tuneId=${g?.__tuneId ?? "(none)"}`);
    });

    // Verify __tuneId survives structuredClone-like path
    const serialized = JSON.parse(JSON.stringify(r));
    const stillHasSwap = serialized.results.some((res: any) =>
      Object.values(res.selection).some((g: any) => {
        const tid = g?.__tuneId;
        return tid && typeof tid === "string" && tid.startsWith("::swap::");
      })
    );
    console.log("PENDANT ONLY — after JSON serialize/parse, hasSwap:", stillHasSwap);
    console.log("PENDANT ONLY — __tuneId type:", typeof r.results[0]?.selection["pendant"]?.__tuneId);

    // Simulate postMessage structuredClone
    const mc = new MessageChannel();
    const clonePromise = new Promise<any>(resolve => { mc.port2.onmessage = e => resolve(e.data); });
    mc.port1.postMessage(r);
    const cloned = await clonePromise;
    mc.port1.close();
    mc.port2.close();
    const hasSwapAfterClone = cloned.results.some((res: any) =>
      Object.values(res.selection).some((g: any) => g?.__tuneId?.startsWith("::swap::"))
    );
    console.log("PENDANT ONLY — after structuredClone, hasSwap:", hasSwapAfterClone);
    console.log("PENDANT ONLY — after structuredClone, __tuneId type:", typeof cloned.results[0]?.selection["pendant"]?.__tuneId);
  });

  it("should generate swap variants with considerTune=true", async () => {
    const r = await computeOptimizeResultsAsync(
      stats as any, elementStats as any, gearData, equipped, 10, undefined, undefined,
      {
        candidateGears: gearData,
        slotsToOptimize: ["weapon_1","weapon_2","disc","pendant","head","chest","hand","leg"] as any,
        considerTune: true,
        autoReduceIfOverCombos: 1,
        reduceTargetCombos: 200000,
        reducePerSlotCap: 0,
      },
    );

    const hasSwapInResults = r.results.some(res =>
      Object.values(res.selection).some((g: any) => g?.__tuneId?.startsWith("::swap::"))
    );

    // Show swap counts at different display sizes
    console.log("baseDamage:", r.baseDamage);
    console.log("totalCombos:", r.totalCombos);
    console.log("results count:", r.results.length);
    console.log("hasSwapInResults:", hasSwapInResults);
    console.log("results with swap:", r.results.filter(res =>
      Object.values(res.selection).some((g: any) => g?.__tuneId?.startsWith("::swap::"))
    ).length);
    // Show first result details
    if (r.results.length > 0) {
      const top = r.results[0];
      console.log("Top result swap gears:", Object.entries(top.selection)
        .filter(([s, g]: any) => g?.__tuneId?.startsWith("::swap::"))
        .map(([s, g]: any) => `${s}:${g.name}:${g.__tuneId}`));
    }

    const tuneIds = new Set<string>();
    for (const res of r.results) {
      for (const g of Object.values(res.selection) as any[]) {
        if (g?.__tuneId) tuneIds.add(g.__tuneId);
      }
    }
    console.log("Unique tune IDs:", [...tuneIds].filter(id => id.startsWith("::swap::")));
    console.log("Unique tune IDs (tune):", [...tuneIds].filter(id => id.startsWith("::tune::")));
  });
});
