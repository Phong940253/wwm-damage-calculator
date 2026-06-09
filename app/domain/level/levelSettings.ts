export type LevelContext = {
  playerLevel: number;
  enemyLevel: number;
};

export const LEVEL_STORAGE_KEYS = {
  player: "wwm_player_level",
  enemy: "wwm_enemy_level",
} as const;

export const DEFAULT_LEVEL_CONTEXT: LevelContext = {
  playerLevel: 81,
  enemyLevel: 81,
};

// Level-scaling table (extend as the game adds more milestones)
const LEVEL_EFFECTS: Record<
  number,
  {
    bossResistancePct: number;
  }
> = {};

export const SUPPORTED_PLAYER_LEVELS = [71, 81, 86, 91, 96, 101];
export const SUPPORTED_ENEMY_LEVELS = [71, 81, 86, 91, 96, 101];

export const SUPPORTED_LEVELS = Array.from(
  new Set([...SUPPORTED_PLAYER_LEVELS, ...SUPPORTED_ENEMY_LEVELS]),
).sort((a, b) => a - b);

export function getBossResistancePct(enemyLevel: number): number {
  if (enemyLevel < 81) return calculateDamageReduction(0);
  if (enemyLevel >= 81 && enemyLevel <= 85) return calculateDamageReduction(15);
  if (enemyLevel >= 86 && enemyLevel <= 90) return calculateDamageReduction(30);
  if (enemyLevel >= 91 && enemyLevel <= 95) return calculateDamageReduction(45);
  if (enemyLevel >= 96 && enemyLevel <= 99) return calculateDamageReduction(65);
  if (enemyLevel >= 100) return calculateDamageReduction(115);
  return calculateDamageReduction(LEVEL_EFFECTS[enemyLevel]?.bossResistancePct ?? 0);
}

export function calculateDamageReduction(resistance: number): number {
  if (resistance < 0) return 0;
  return resistance / (resistance + 100);
}

export function clampToSupportedPlayerLevel(level: number): number {
  if (!Number.isFinite(level)) return DEFAULT_LEVEL_CONTEXT.playerLevel;
  if (SUPPORTED_PLAYER_LEVELS.includes(level)) return level;
  return DEFAULT_LEVEL_CONTEXT.playerLevel;
}

export function clampToSupportedEnemyLevel(level: number): number {
  if (!Number.isFinite(level)) return DEFAULT_LEVEL_CONTEXT.enemyLevel;
  if (SUPPORTED_ENEMY_LEVELS.includes(level)) return level;
  return DEFAULT_LEVEL_CONTEXT.enemyLevel;
}

export function clampToSupportedLevel(level: number): number {
  if (!Number.isFinite(level)) return DEFAULT_LEVEL_CONTEXT.playerLevel;
  if (SUPPORTED_LEVELS.includes(level)) return level;
  return DEFAULT_LEVEL_CONTEXT.playerLevel;
}

function safeParseStoredNumber(raw: string | null): number | null {
  if (!raw) return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  return v;
}

export function getStoredLevelContext(): LevelContext {
  const storage =
    typeof globalThis !== "undefined"
      ? (globalThis as { localStorage?: Storage }).localStorage
      : undefined;

  // SSR / worker-safe fallback
  if (!storage) return DEFAULT_LEVEL_CONTEXT;

  const storedPlayer = safeParseStoredNumber(
    storage.getItem(LEVEL_STORAGE_KEYS.player),
  );
  const storedEnemy = safeParseStoredNumber(
    storage.getItem(LEVEL_STORAGE_KEYS.enemy),
  );

  return {
    playerLevel: clampToSupportedPlayerLevel(
      storedPlayer ?? DEFAULT_LEVEL_CONTEXT.playerLevel,
    ),
    enemyLevel: clampToSupportedEnemyLevel(
      storedEnemy ?? DEFAULT_LEVEL_CONTEXT.enemyLevel,
    ),
  };
}

export function setStoredLevelContext(next: Partial<LevelContext>) {
  const storage =
    typeof globalThis !== "undefined"
      ? (globalThis as { localStorage?: Storage }).localStorage
      : undefined;

  if (!storage) return;

  if (typeof next.playerLevel === "number") {
    storage.setItem(
      LEVEL_STORAGE_KEYS.player,
      String(clampToSupportedPlayerLevel(next.playerLevel)),
    );
  }

  if (typeof next.enemyLevel === "number") {
    storage.setItem(
      LEVEL_STORAGE_KEYS.enemy,
      String(clampToSupportedEnemyLevel(next.enemyLevel)),
    );
  }

  // Notify in-tab listeners (storage event doesn't fire in the same tab).
  try {
    (globalThis as { dispatchEvent?: (ev: Event) => void }).dispatchEvent?.(
      new Event("wwm_level_context_changed"),
    );
  } catch {
    // ignore
  }
}
