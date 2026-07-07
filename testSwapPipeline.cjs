/**
 * Standalone integration test that simulates the worker pipeline:
 *   expansion → reduction → DFS → results
 * to verify swap variants survive reduction.
 */

const path = require("path");
const { spawn } = require("child_process");

async function main() {
  // Write a temp test file that vitest can run
  const testCode = `
import { describe, it, expect } from "vitest";
import { computeOptimizeResultsAsync } from "@/app/domain/gear/gearOptimize";
import type { CustomGear, InputStats, ElementStats } from "@/app/types";

const baseStats: InputStats = {
  HP: { current: 60000, increase: 0 },
  MinPhysicalAttack: { current: 5000, increase: 0 },
  MaxPhysicalAttack: { current: 6000, increase: 0 },
  PhysicalAttackMultiplier: { current: 100, increase: 0 },
  FlatDamage: { current: 300, increase: 0 },
  PrecisionRate: { current: 94, increase: 0 },
  CriticalRate: { current: 30, increase: 0 },
  DirectCriticalRate: { current: 0, increase: 0 },
  CriticalDMGBonus: { current: 50, increase: 0 },
  AffinityRate: { current: 15, increase: 0 },
  DirectAffinityRate: { current: 0, increase: 0 },
  AffinityDMGBonus: { current: 35, increase: 0 },
  DamageBoost: { current: 0, increase: 0 },
  CombatBoostAgainstBossUnits: { current: 0, increase: 0 },
  MartialArtSkillDamageBoost: { current: 0, increase: 0 },
  AllMartialArtsBoost: { current: 0, increase: 0 },
  ChargeSkillDamageBoost: { current: 0, increase: 0 },
  BallisticSkillDamageBoost: { current: 0, increase: 0 },
  PursuitSkillDamageBoost: { current: 0, increase: 0 },
  MoonlitShatterSpringPursuitCriticalDMGBonus: { current: 0, increase: 0 },
  ArtOfSwordDMGBoost: { current: 0, increase: 0 },
  ArtOfSpearDMGBoost: { current: 0, increase: 0 },
  ArtOfFanDMGBoost: { current: 0, increase: 0 },
  ArtOfUmbrellaDMGBoost: { current: 0, increase: 0 },
  ArtOfHorizontalBladeDMGBoost: { current: 0, increase: 0 },
  ArtOfMoBladeDMGBoost: { current: 0, increase: 0 },
  ArtOfDualBladesDMGBoost: { current: 0, increase: 0 },
  ArtOfRopeDartDMGBoost: { current: 0, increase: 0 },
  SoulshadeUmbrellaSpinningUmbrellaDMGBoost: { current: 0, increase: 0 },
  PhysicalDefense: { current: 200, increase: 0 },
  PhysicalResistance: { current: 10, increase: 0 },
  PhysicalDMGBonus: { current: 0, increase: 0 },
  PhysicalDMGReduction: { current: 0, increase: 0 },
  PhysicalPenetration: { current: 15, increase: 0 },
  Body: { current: 100, increase: 0 },
  Power: { current: 200, increase: 0 },
  Defense: { current: 50, increase: 0 },
  Agility: { current: 100, increase: 0 },
  Momentum: { current: 150, increase: 0 },
};

const baseElementStats: ElementStats = {
  selected: "bellstrike",
  martialArtsId: "bellstrike_splendor",
  MainElementMultiplier: { current: 100, increase: 0 },
  bellstrikeMin: { current: 280, increase: 0 },
  bellstrikeMax: { current: 560, increase: 0 },
  bellstrikePenetration: { current: 24, increase: 0 },
  bellstrikeDMGBonus: { current: 9, increase: 0 },
  stonesplitMin: { current: 0, increase: 0 },
  stonesplitMax: { current: 0, increase: 0 },
  stonesplitPenetration: { current: 0, increase: 0 },
  stonesplitDMGBonus: { current: 0, increase: 0 },
  silkbindMin: { current: 0, increase: 0 },
  silkbindMax: { current: 0, increase: 0 },
  silkbindPenetration: { current: 0, increase: 0 },
  silkbindDMGBonus: { current: 0, increase: 0 },
  bamboocutMin: { current: 0, increase: 0 },
  bamboocutMax: { current: 0, increase: 0 },
  bamboocutPenetration: { current: 0, increase: 0 },
  bamboocutDMGBonus: { current: 0, increase: 0 },
};

function makeGear(overrides) {
  return {
    name: "Test Gear",
    level: 91,
    mains: [{ stat: "MaxPhysicalAttack", value: 100 }],
    subs: [
      { stat: "Momentum", value: 35 },
      { stat: "CriticalRate", value: 7.4 },
      { stat: "MaxPhysicalAttack", value: 60 },
      { stat: "AffinityRate", value: 3.5 },
      { stat: "bellstrikeMax", value: 35 },
    ],
    ...overrides,
  };
}

describe("Worker pipeline simulation", () => {
  it("swap variants survive aggressive reduction (autoReduceIfOverCombos=1)", async () => {
    // Create 8 slots of gear, some with addition, some tunable
    const gears = [];
    const gearIds = [];
    const slots = ["weapon_1","weapon_2","disc","pendant","head","chest","hand","leg"];
    
    for (const slot of slots) {
      // Add 4 items per slot to trigger reduction
      for (let j = 0; j < 4; j++) {
        const id = slot + "_" + j;
        gearIds.push(id);
        gears.push(makeGear({
          id,
          name: slot + " #" + j,
          slot,
          // Alternate: every other item has addition
          ...(j % 2 === 0 ? { addition: { stat: j === 0 ? "bellstrikePenetration" : "PhysicalPenetration", value: 8 + j } } : {}),
          ...(j === 1 ? { tunedSubIndex: 2, tuneHistory: [{ subIndex: 2, stat: "Power" }] } : {}),
        }));
      }
    }
    
    const equipped = {};
    
    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, equipped, 10, undefined, undefined,
      { 
        candidateGears: gears, 
        slotsToOptimize: slots,
        considerTune: true,
        autoReduceIfOverCombos: 1,  // Aggressive reduction like worker mode
        reduceTargetCombos: 200000,
      },
    );
    
    // Check if any result has a swap variant
    const hasSwap = r.results.some(res => 
      Object.values(res.selection).some(g => g && g.__tuneId?.startsWith("::swap::"))
    );
    
    console.log("Total results:", r.results.length);
    console.log("Has swap variant:", hasSwap);
    if (hasSwap) {
      // Show which slots have swaps
      for (const res of r.results) {
        for (const [slot, g] of Object.entries(res.selection)) {
          if (g && g.__tuneId?.startsWith("::swap::")) {
            console.log("  Result with swap:", slot, g.name, g.__tuneId, g.__tuneLabel);
          }
        }
      }
    }
    
    expect(hasSwap).toBe(true);
  });
});
`;

  const fs = require("fs");
  fs.writeFileSync("tests/swapPipelineTest.spec.ts", testCode);
  
  // Run the test
  const p = spawn("pnpm", ["test", "--", "tests/swapPipelineTest.spec.ts", "--reporter=verbose"], {
    cwd: "F:\\Freelance\\wwm-damage-calculator",
    stdio: "inherit",
    shell: true,
    env: { ...process.env, CI: "true" },
  });
  
  return new Promise((resolve, reject) => {
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Test failed with code " + code));
    });
    p.on("error", reject);
  });
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
