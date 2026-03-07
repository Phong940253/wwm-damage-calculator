import { Rotation } from "@/app/types";

import rotationsJson from "../skill/data/defaultRotations.json";

const toPassiveUptimes = (
  value: unknown,
): Record<string, number> | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const entries = Object.entries(value).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

type RotationJson = Omit<Rotation, "passiveUptimes"> & {
  passiveUptimes?: unknown;
};

const rotationsData = rotationsJson as unknown as RotationJson[];

export const DEFAULT_ROTATIONS: Rotation[] = rotationsData.map((rotation) => ({
  ...rotation,
  passiveUptimes: toPassiveUptimes(rotation.passiveUptimes),
}));
