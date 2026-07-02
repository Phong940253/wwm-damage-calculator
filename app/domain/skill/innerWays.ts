import { InnerWay } from "./passiveSkillTypes";
import innerWaysData from "./data/innerWays.json";

export const SWORD_MORPH_T3_INNER_WAY_ID = "iw_bellstrike_sword_morph_t3";
export const SWORD_MORPH_T5_INNER_WAY_ID = "iw_bellstrike_sword_morph_t5";
export const SWORD_MORPH_INNER_WAY_IDS = [
  SWORD_MORPH_T3_INNER_WAY_ID,
  SWORD_MORPH_T5_INNER_WAY_ID,
];

export let INNER_WAYS: InnerWay[] = innerWaysData as InnerWay[];

export function setInnerWays(data: InnerWay[]) {
  INNER_WAYS = data;
}
