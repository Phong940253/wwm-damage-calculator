import { describe, it, expect } from "vitest";
import { buildRelayedGear } from "@/app/domain/gear/gearRelay";
import { computeRelayedSubValue } from "@/app/domain/gear/tuneAdvisor";
import { MAIN_STAT_BY_LEVEL } from "@/app/domain/gear/gearConstants";
import type { CustomGear, GearSlot } from "@/app/types";

function lv96RelayValue(stat: string): number {
  return computeRelayedSubValue(stat as Parameters<typeof computeRelayedSubValue>[0]);
}

function makeGear(overrides: Partial<CustomGear> & { id: string; slot: CustomGear["slot"] }): CustomGear {
  return {
    name: "Test Gear",
    mains: [],
    subs: [],
    ...overrides,
  };
}

describe("buildRelayedGear", () => {
  it("relays sub stats to 94% of lv96 max per line", () => {
    const gear = makeGear({
      id: "test_1",
      slot: "disc",
      level: 91,
      subs: [
        { stat: "CriticalRate", value: 7.4 },
        { stat: "Power", value: 40.4 },
        { stat: "PhysicalPenetration", value: 9.0 },
        { stat: "bellstrikeMax", value: 36.2 },
      ],
    });

    const relayed = buildRelayedGear(gear, "disc");

    expect(relayed.subs).toHaveLength(4);
    expect(relayed.subs[0]).toEqual({ stat: "CriticalRate", value: lv96RelayValue("CriticalRate") });
    expect(relayed.subs[1]).toEqual({ stat: "Power", value: lv96RelayValue("Power") });
    expect(relayed.subs[2]).toEqual({ stat: "PhysicalPenetration", value: lv96RelayValue("PhysicalPenetration") });
    expect(relayed.subs[3]).toEqual({ stat: "bellstrikeMax", value: lv96RelayValue("bellstrikeMax") });
  });

  it("overrides main stat to lv96 value when MAIN_STAT_BY_LEVEL[96] exists", () => {
    const gear = makeGear({
      id: "test_2",
      slot: "disc",
      level: 91,
      mains: [{ stat: "MinPhysicalAttack", value: 71 }],
    });

    const relayed = buildRelayedGear(gear, "disc");
    const expected = MAIN_STAT_BY_LEVEL[96].disc?.MinPhysicalAttack ?? 71;

    expect(relayed.mains).toHaveLength(1);
    expect(relayed.mains[0]).toEqual({ stat: "MinPhysicalAttack", value: expected });
  });

  it("preserves main stat when not in MAIN_STAT_BY_LEVEL[96]", () => {
    const gear = makeGear({
      id: "test_3",
      slot: "head",
      level: 91,
      mains: [{ stat: "Momentum", value: 37.1 }],
    });

    const relayed = buildRelayedGear(gear, "head");

    expect(relayed.mains).toHaveLength(1);
    expect(relayed.mains[0]).toEqual({ stat: "Momentum", value: 37.1 });
  });

  it("merges legacy .main into .mains", () => {
    const gear = makeGear({
      id: "test_4",
      slot: "disc",
      level: 91,
      main: { stat: "MinPhysicalAttack", value: 71 },
      mains: [{ stat: "Momentum", value: 37.1 }],
    });

    const relayed = buildRelayedGear(gear, "disc");

    expect(relayed.main).toBeUndefined();
    expect(relayed.mains).toHaveLength(2);
    const minPhys = relayed.mains.find(m => m.stat === "MinPhysicalAttack");
    expect(minPhys).toBeDefined();
    expect(minPhys!.value).toBe(MAIN_STAT_BY_LEVEL[96].disc!.MinPhysicalAttack);
  });

  it("sets .main to undefined", () => {
    const gear = makeGear({
      id: "test_5",
      slot: "disc",
      level: 91,
      main: { stat: "MinPhysicalAttack", value: 71 },
      mains: [],
    });

    const relayed = buildRelayedGear(gear, "disc");

    expect(relayed.main).toBeUndefined();
  });

  it("does not change addition stat", () => {
    const gear = makeGear({
      id: "test_6",
      slot: "disc",
      level: 91,
      addition: { stat: "MinPhysicalAttack", value: 71 },
      mains: [],
    });

    const relayed = buildRelayedGear(gear, "disc");

    expect(relayed.addition).toEqual({ stat: "MinPhysicalAttack", value: 71 });
  });

  it("handles empty subs", () => {
    const gear = makeGear({
      id: "test_7",
      slot: "disc",
      level: 91,
      subs: [],
    });

    const relayed = buildRelayedGear(gear, "disc");

    expect(relayed.subs).toEqual([]);
  });

  it("handles weapon_1 slot with both Min/Max PhysicalAttack mains", () => {
    const gear = makeGear({
      id: "test_8",
      slot: "weapon_1",
      level: 91,
      mains: [
        { stat: "MinPhysicalAttack", value: 53 },
        { stat: "MaxPhysicalAttack", value: 124 },
      ],
    });

    const relayed = buildRelayedGear(gear, "weapon_1");
    const lv96 = MAIN_STAT_BY_LEVEL[96].weapon_1!;

    expect(relayed.mains).toHaveLength(2);
    expect(relayed.mains.find(m => m.stat === "MinPhysicalAttack")!.value).toBe(lv96.MinPhysicalAttack);
    expect(relayed.mains.find(m => m.stat === "MaxPhysicalAttack")!.value).toBe(lv96.MaxPhysicalAttack);
  });
});
