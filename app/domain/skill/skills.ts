import { Skill } from "./types";

export const SKILLS: Skill[] = [
  /* ================= Bellstrike – Splendor ================= */

  {
    id: "splendor_charged_slash",
    name: "Charged Slash",
    martialArtId: "bellstrike_splendor",
    category: "skill",
    hits: [{ physicalMultiplier: 1.6, elementMultiplier: 1.2, hits: 1 }],
  },

  {
    id: "splendor_triple_cut",
    name: "Triple Cut",
    martialArtId: "bellstrike_splendor",
    category: "skill",
    hits: [{ physicalMultiplier: 0.7, elementMultiplier: 0.6, hits: 3 }],
  },

  /* ================= Bellstrike – Umbra ================= */

  {
    id: "umbra_bleed_slash",
    name: "Bleeding Slash",
    martialArtId: "bellstrike_umbra",
    category: "skill",
    hits: [{ physicalMultiplier: 1.1, elementMultiplier: 0.9, hits: 1 }],
    notes: "Applies Bleed (DoT not included)",
  },

  /* ================= Silkbind – Jade ================= */

  {
    id: "jade_air_pierce",
    name: "Airborne Pierce",
    martialArtId: "silkbind_jade",
    category: "skill",
    hits: [{ physicalMultiplier: 0.9, elementMultiplier: 1.3, hits: 2 }],
  },
];
