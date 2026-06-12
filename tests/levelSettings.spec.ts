import { describe, it, expect } from "vitest";
import {
  calculateDamageReduction,
  getBossResistancePct,
  getBossPhysDef,
  getBossResistance,
} from "../app/domain/level/levelSettings";

describe("levelSettings", () => {
  describe("calculateDamageReduction", () => {
    it("should return 0 for 0 resistance", () => {
      expect(calculateDamageReduction(0)).toBe(0);
    });

    it("should follow the formula Resistance / (Resistance + 100)", () => {
      // 50 / (50 + 100) = 50 / 150 = 1/3 ≈ 0.333333
      expect(calculateDamageReduction(50)).toBeCloseTo(1 / 3, 6);
      // 100 / (100 + 100) = 100 / 200 = 0.5
      expect(calculateDamageReduction(100)).toBe(0.5);
    });

    it("should handle negative resistance", () => {
      expect(calculateDamageReduction(-10)).toBe(0);
    });
  });

  describe("getBossPhysDef", () => {
    it("should follow round(106 + 0.275 × level)", () => {
      expect(getBossPhysDef(16)).toBe(Math.round(106 + 0.275 * 16));
      expect(getBossPhysDef(31)).toBe(Math.round(106 + 0.275 * 31));
      expect(getBossPhysDef(41)).toBe(Math.round(106 + 0.275 * 41));
      expect(getBossPhysDef(51)).toBe(Math.round(106 + 0.275 * 51));
      expect(getBossPhysDef(56)).toBe(Math.round(106 + 0.275 * 56));
      expect(getBossPhysDef(61)).toBe(Math.round(106 + 0.275 * 61));
      expect(getBossPhysDef(66)).toBe(Math.round(106 + 0.275 * 66));
      expect(getBossPhysDef(71)).toBe(Math.round(106 + 0.275 * 71));
      expect(getBossPhysDef(76)).toBe(Math.round(106 + 0.275 * 76));
      expect(getBossPhysDef(81)).toBe(Math.round(106 + 0.275 * 81));
      expect(getBossPhysDef(86)).toBe(Math.round(106 + 0.275 * 86));
      expect(getBossPhysDef(91)).toBe(Math.round(106 + 0.275 * 91));
      expect(getBossPhysDef(96)).toBe(Math.round(106 + 0.275 * 96));
      expect(getBossPhysDef(101)).toBe(Math.round(106 + 0.275 * 101));
    });

    it("should return 0 for NaN or Infinity", () => {
      expect(getBossPhysDef(NaN)).toBe(0);
      expect(getBossPhysDef(Infinity)).toBe(0);
    });
  });

  describe("getBossResistance", () => {
    it("should return correct values for known levels", () => {
      expect(getBossResistance(16)).toBe(30);
      expect(getBossResistance(31)).toBe(36);
      expect(getBossResistance(41)).toBe(40);
      expect(getBossResistance(51)).toBe(44);
      expect(getBossResistance(56)).toBe(46);
      expect(getBossResistance(61)).toBe(48);
      expect(getBossResistance(66)).toBe(50);
      expect(getBossResistance(71)).toBe(52);
      expect(getBossResistance(76)).toBe(54);
      expect(getBossResistance(81)).toBe(45);
      expect(getBossResistance(86)).toBe(48);
      expect(getBossResistance(91)).toBe(51);
      expect(getBossResistance(96)).toBe(65);
      expect(getBossResistance(101)).toBe(65);
    });

    it("should use bracket values for 81+", () => {
      expect(getBossResistance(82)).toBe(45);
      expect(getBossResistance(87)).toBe(48);
      expect(getBossResistance(92)).toBe(51);
      expect(getBossResistance(97)).toBe(65);
    });

    it("should return 30 for levels below 16", () => {
      expect(getBossResistance(1)).toBe(30);
      expect(getBossResistance(10)).toBe(30);
    });

    it("should return 0 for NaN or Infinity", () => {
      expect(getBossResistance(NaN)).toBe(0);
      expect(getBossResistance(Infinity)).toBe(0);
    });
  });

  describe("getBossResistancePct", () => {
    it("should return correct calculated reduction values based on level brackets", () => {
      // Resistance / (Resistance + 100)
      expect(getBossResistancePct(80)).toBe(calculateDamageReduction(0)); // 0
      expect(getBossResistancePct(81)).toBe(calculateDamageReduction(15)); // 15/115 ≈ 0.130435
      expect(getBossResistancePct(85)).toBe(calculateDamageReduction(15)); // 15/115 ≈ 0.130435
      expect(getBossResistancePct(86)).toBe(calculateDamageReduction(30)); // 30/130 ≈ 0.230769
      expect(getBossResistancePct(90)).toBe(calculateDamageReduction(30)); // 30/130 ≈ 0.230769
      expect(getBossResistancePct(91)).toBe(calculateDamageReduction(45)); // 45/145 ≈ 0.310345
      expect(getBossResistancePct(95)).toBe(calculateDamageReduction(45)); // 45/145 ≈ 0.310345
      expect(getBossResistancePct(96)).toBe(calculateDamageReduction(65)); // 65/165 ≈ 0.393939
      expect(getBossResistancePct(99)).toBe(calculateDamageReduction(65)); // 65/165 ≈ 0.393939
      expect(getBossResistancePct(100)).toBe(calculateDamageReduction(115)); // 115/215 ≈ 0.534884
      expect(getBossResistancePct(101)).toBe(calculateDamageReduction(115)); // 115/215 ≈ 0.534884
    });
  });
});
