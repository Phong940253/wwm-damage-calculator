import { InnerWay } from "./passiveSkillTypes";

import innerWaysData from "./data/innerWays.json";

/**
 * Database Inner Ways
 * Có thể áp dụng cho cụ thể martial art hoặc tất cả
 */
export const INNER_WAYS: InnerWay[] = [...(innerWaysData as InnerWay[])];
