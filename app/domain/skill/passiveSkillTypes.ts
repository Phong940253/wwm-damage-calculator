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
  martialArtId: MartialArtId;

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

  /** modifier effects (thường là flat, hiếm khi scale) */
  modifiers: PassiveModifier[];

  /** (optional) tier/level của inner way */
  level?: number;

  notes?: string;
}
