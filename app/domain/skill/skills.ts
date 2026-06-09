import { Skill } from "./types";
import skillsJson from "./data/skills.json";

export let SKILLS: Skill[] = skillsJson as Skill[];

export function setSkills(data: Skill[]) {
  SKILLS = data;
}
