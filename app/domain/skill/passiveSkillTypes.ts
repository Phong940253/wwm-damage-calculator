import { InputStats, ElementStatKey } from "@/app/types";
import { MartialArtId } from "./types";

/**
 * Modifier type:
 * - "flat": cộng trực tiếp vào stat (vd +100 atk, +3% crit -> +3)
 * - "scale": cộng theo công thức tuyến tính: add = source * ratio (có thể có giới hạn)
 */
export type ModifierType = "flat" | "scale";

export type StatKey = keyof InputStats | ElementStatKey;

export type PassiveModifier =
  | {
      stat: StatKey;
      type: "flat";
      value: number;
      /** If false, this modifier is applied at full value regardless of passive uptime. */
      applyUptime?: boolean;
      /** Giới hạn tối đa cho phần cộng thêm của modifier này */
      max?: number;
      /** Giới hạn tối thiểu cho phần cộng thêm của modifier này */
      min?: number;
    }
  | {
      stat: StatKey;
      type: "scale";
      /** stat nguồn dùng để tính toán */
      sourceStat: StatKey;
      /** add = source * ratio */
      ratio: number;
      /** If false, this modifier is applied at full value regardless of passive uptime. */
      applyUptime?: boolean;
      /** Giới hạn tối đa cho phần cộng thêm của modifier này */
      max?: number;
      /** Giới hạn tối thiểu cho phần cộng thêm của modifier này */
      min?: number;
    };

/**
 * Passive Skill - gắn vào Martial Art
 */
export interface PassiveSkill {
  id: string;
  name: string;
  description: string;

  /** martial art mà passive này thuộc về */
  martialArtId?: MartialArtId;

  /**
   * Optional: For universal passives (martialArtId undefined), decide which martial arts
   * should have this passive enabled by default.
   */
  defaultEnabledForMartialArtIds?: MartialArtId[];

  /** Optional: default uptime % (0..100) for conditional passives */
  defaultUptimePercent?: number;

  /** một hoặc nhiều modifier */
  modifiers: PassiveModifier[];

  /** (optional) condition hoặc note thêm */
  notes?: string;
}

/**
 * Inner Way - có thể dùng cho cụ thể martial art hoặc tất cả
 */
export interface InnerWay {
  id: string;
  name: string;
  description: string;

  /**
   * - null/undefined = applicable to all martial arts
   * - specific MartialArtId = only for that martial art
   */
  applicableToMartialArtId?: MartialArtId;

  /**
   * Optional: For universal inner ways (applicableToMartialArtId undefined), decide
   * which martial arts should have this inner way enabled by default.
   * If omitted, it is enabled by default.
   */
  defaultEnabledForMartialArtIds?: MartialArtId[];

  /** modifier effects (thường là flat, hiếm khi scale) */
  modifiers: PassiveModifier[];

  /** (optional) tier/level của inner way */
  level?: number;

  notes?: string;
}
