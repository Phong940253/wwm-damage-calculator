import { Rotation } from "@/app/types";
import defaultRotationsJson from "./data/defaultRotations.json";

export let DEFAULT_ROTATIONS: Rotation[] =
  defaultRotationsJson as unknown as Rotation[];

const _listeners = new Set<() => void>();

export function setDefaultRotations(data: Rotation[]) {
  DEFAULT_ROTATIONS = data;
  for (const fn of _listeners) fn();
}

export function subscribeToDefaultRotations(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
