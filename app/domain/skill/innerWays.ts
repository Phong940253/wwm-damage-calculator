import { InnerWay } from "./passiveSkillTypes";

import innerWaysData from "./data/innerWays.json";

export const SWORD_MORPH_T3_INNER_WAY_ID = "iw_bellstrike_sword_morph_t3";
export const SWORD_MORPH_T5_INNER_WAY_ID = "iw_bellstrike_sword_morph_t5";

/**
 * Database Inner Ways
 * Có thể áp dụng cho cụ thể martial art hoặc tất cả
 */
export const INNER_WAYS: InnerWay[] = [...(innerWaysData as InnerWay[])];
