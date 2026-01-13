import { PassiveSkill } from "./passiveSkillTypes";

import passiveSkillsData from "./data/passiveSkills.json";

/**
 * Database Passive Skills gắn vào từng Martial Art
 * Bao gồm các skill từ game "Where Winds Meet"
 */
export const PASSIVE_SKILLS: PassiveSkill[] = [
  ...(passiveSkillsData as PassiveSkill[]),
];
