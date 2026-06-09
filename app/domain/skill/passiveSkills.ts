import { PassiveSkill } from "./passiveSkillTypes";
import passiveSkillsData from "./data/passiveSkills.json";

export let PASSIVE_SKILLS: PassiveSkill[] = passiveSkillsData as PassiveSkill[];

export function setPassiveSkills(data: PassiveSkill[]) {
  PASSIVE_SKILLS = data;
}
