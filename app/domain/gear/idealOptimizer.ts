export * from "./types";
export * from "./gearConstants";
export * from "./optimizerUtils";

import {
  calculateIdealGearStats as calculateIdealGearStatsImported,
  calculateIdealGearStatsFast as calculateIdealGearStatsFastImported,
  calculateIdealGearStatsBeamSearch as calculateIdealGearStatsBeamSearchImported,
  distributeStatsToGears as distributeStatsToGearsImported,
} from "./optimizer";

export const calculateIdealGearStats = calculateIdealGearStatsImported;
export const calculateIdealGearStatsFast = calculateIdealGearStatsFastImported;
export const calculateIdealGearStatsBeamSearch =
  calculateIdealGearStatsBeamSearchImported;
export const distributeStatsToGears = distributeStatsToGearsImported;
