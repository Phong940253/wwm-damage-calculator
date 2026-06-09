import { describe, it, expect } from "vitest";
import { calculateDamageReduction, getBossResistancePct } from "../app/domain/level/levelSettings";

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
