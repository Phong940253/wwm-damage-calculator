import { Rotation } from "@/app/types";
import defaultRotationsJson from "./data/defaultRotations.json";

export let DEFAULT_ROTATIONS: Rotation[] = defaultRotationsJson as unknown as Rotation[];

export function setDefaultRotations(data: Rotation[]) {
  DEFAULT_ROTATIONS = data;
}
