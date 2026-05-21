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
    playerDirectPrecisionPct: number;
  }
> = {
  71: { bossResistancePct: 0, playerDirectPrecisionPct: 8.5 },
  81: { bossResistancePct: 13, playerDirectPrecisionPct: 9.8 },
  91: { bossResistancePct: 45, playerDirectPrecisionPct: 13.5 },
  95: { bossResistancePct: 45, playerDirectPrecisionPct: 13.5 },
};

export const SUPPORTED_PLAYER_LEVELS = [71, 81, 91, 95];
export const SUPPORTED_ENEMY_LEVELS = [71, 81, 85, 90, 95, 100];

export const SUPPORTED_LEVELS = Array.from(
  new Set([...SUPPORTED_PLAYER_LEVELS, ...SUPPORTED_ENEMY_LEVELS]),
).sort((a, b) => a - b);

export function getBossResistancePct(enemyLevel: number): number {
  if (enemyLevel >= 81 && enemyLevel <= 85) return 13;
  if (enemyLevel >= 86 && enemyLevel <= 90) return 30;
  if (enemyLevel >= 91 && enemyLevel <= 95) return 45;
  if (enemyLevel >= 96 && enemyLevel <= 100) return 65;
  return LEVEL_EFFECTS[enemyLevel]?.bossResistancePct ?? 0;
}

export function getPlayerDirectPrecisionPct(playerLevel: number): number {
  if (playerLevel >= 91 && playerLevel <= 95) return 13.5;
  return LEVEL_EFFECTS[playerLevel]?.playerDirectPrecisionPct ?? 0;
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
  // SSR / worker-safe fallback
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_LEVEL_CONTEXT;
  }

  const storedPlayer = safeParseStoredNumber(
    window.localStorage.getItem(LEVEL_STORAGE_KEYS.player),
  );
  const storedEnemy = safeParseStoredNumber(
    window.localStorage.getItem(LEVEL_STORAGE_KEYS.enemy),
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
  if (typeof window === "undefined" || !window.localStorage) return;

  if (typeof next.playerLevel === "number") {
    window.localStorage.setItem(
      LEVEL_STORAGE_KEYS.player,
      String(clampToSupportedPlayerLevel(next.playerLevel)),
    );
  }

  if (typeof next.enemyLevel === "number") {
    window.localStorage.setItem(
      LEVEL_STORAGE_KEYS.enemy,
      String(clampToSupportedEnemyLevel(next.enemyLevel)),
    );
  }

  // Notify in-tab listeners (storage event doesn't fire in the same tab).
  try {
    window.dispatchEvent(new Event("wwm_level_context_changed"));
  } catch {
    // ignore
  }
}
