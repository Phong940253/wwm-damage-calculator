import { InputStats, ElementStatKey } from "@/app/types";
import { MartialArtId } from "./types";

/**
 * Modifier type:
 * - "stat": scale theo final stat (% của stat)
 * - "flat": thêm giá trị cố định
 */
export type ModifierType = "stat" | "flat";

export interface PassiveModifier {
  stat: keyof InputStats | ElementStatKey;
  type: ModifierType;
  value: number; // nếu type="stat" thì % (0.1 = 10%), nếu type="flat" thì số cố định
}

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
