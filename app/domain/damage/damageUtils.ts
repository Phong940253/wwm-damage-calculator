// app/domain/damage/damageUtils.ts
/**
 * Utility functions for damage calculations
 * Optimized for reusability and performance
 */

/**
 * Apply modifier stack to a base value
 * Useful for: physical penetration, damage bonuses, boost effects
 */
export const applyModifierStack = (
  base: number,
  modifiers: number[]
): number => {
  return base * modifiers.reduce((acc, mod) => acc * (1 + mod), 1);
};

/**
 * Calculate physical attack contribution with all modifiers
 */
export const calcPhysicalContribution = (
  physicalValue: number,
  penetration: number,
  dmgBonus: number,
  multiplier: number,
  otherAttribute: number
): number => {
  const physModifier = 1 + penetration / 200;
  const physBonus = 1 + dmgBonus / 100;
  return (
    (physicalValue * physModifier * physBonus + otherAttribute) *
    (multiplier / 100)
  );
};

/**
 * Calculate element attack contribution with penetration and bonus
 */
export const calcElementContribution = (
  elementValue: number,
  multiplier: number,
  penetration: number,
  dmgBonus: number
): number => {
  return (
    elementValue *
    (multiplier / 100) *
    (1 + penetration / 200 + dmgBonus / 100)
  );
};

/**
 * Normalize probabilities (affinity + critical) if they exceed 1
 */
export const normalizeProbabilities = (
  affinity: number,
  critical: number
): { affinity: number; critical: number; scale: number } => {
  const total = affinity + critical;
  if (total > 1) {
    const scale = 1 / total;
    return {
      affinity: affinity * scale,
      critical: critical * scale,
      scale,
    };
  }
  return { affinity, critical, scale: 1 };
};

/**
 * Clamp value between 0 and 1
 */
export const clampProbability = (value: number): number => {
  return Math.max(0, Math.min(1, value));
};

/**
 * Calculate average value from min/max range
 * Handles equal min/max edge case
 */
export const calcAverage = (min: number, max: number): number => {
  return min >= max ? min : (min + max) / 2;
};
