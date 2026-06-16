import { describe, it, expect } from "vitest";
import {
  calculateDamageReduction,
  getBossResistancePct,
  getBossDef,
  getBossResistance,
} from "../app/domain/level/levelSettings";

describe("levelSettings", () => {
  describe("calculateDamageReduction", () => {
    it("should return 0 for 0 resistance", () => {
      expect(calculateDamageReduction(0)).toBe(0);
    });

    it("should follow the formula Resistance / (Resistance + 100)", () => {
      expect(calculateDamageReduction(50)).toBeCloseTo(1 / 3, 6);
      expect(calculateDamageReduction(100)).toBe(0.5);
    });

    it("should handle negative resistance", () => {
      expect(calculateDamageReduction(-10)).toBe(0);
    });
  });

  describe("getBossDef", () => {
    it("should follow max(0, 119 − 10×lv + 0.184×lv²)", () => {
      const calc = (lv: number) => Math.max(0, 119 - 10 * lv + 0.184 * lv * lv);
      expect(getBossDef(16)).toBeCloseTo(calc(16), 6);
      expect(getBossDef(31)).toBeCloseTo(calc(31), 6);
      expect(getBossDef(51)).toBeCloseTo(calc(51), 6);
      expect(getBossDef(76)).toBeCloseTo(calc(76), 6);
      expect(getBossDef(91)).toBeCloseTo(calc(91), 6);
    });

    it("should return 0 when formula yields negative", () => {
      expect(getBossDef(20)).toBe(0);
      expect(getBossDef(27)).toBe(0);
      expect(getBossDef(31)).toBe(0);
    });

    it("should return positive beyond the negative range", () => {
      expect(getBossDef(40)).toBeGreaterThan(0);
      expect(getBossDef(51)).toBeGreaterThan(0);
    });

    it("should return 0 for NaN or Infinity", () => {
      expect(getBossDef(NaN)).toBe(0);
      expect(getBossDef(Infinity)).toBe(0);
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
