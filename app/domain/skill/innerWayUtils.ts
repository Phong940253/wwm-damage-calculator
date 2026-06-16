import { INNER_WAYS } from "./innerWays";

export const INNER_WAY_BY_ID = new Map(INNER_WAYS.map((iw) => [iw.id, iw] as const));

export const INNER_WAY_GROUP_IDS = (() => {
  const groupToIds = new Map<string, string[]>();
  for (const iw of INNER_WAYS) {
    const gid = iw.tierGroupId;
    if (!gid) continue;
    const arr = groupToIds.get(gid) ?? [];
    arr.push(iw.id);
    groupToIds.set(gid, arr);
  }
  return groupToIds;
})();

export function collapseInnerWayTiers(activeIds: string[]): string[] {
  if (!activeIds || activeIds.length === 0) return [];

  const active = new Set(activeIds);

  for (const [, ids] of INNER_WAY_GROUP_IDS.entries()) {
    const enabledInGroup = ids
      .filter((id) => active.has(id))
      .map((id) => INNER_WAY_BY_ID.get(id))
      .filter(Boolean) as NonNullable<(typeof INNER_WAYS)[number]>[];

    if (enabledInGroup.length <= 1) continue;

    enabledInGroup.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    const keep = enabledInGroup[enabledInGroup.length - 1]!.id;

    for (const id of ids) active.delete(id);
    active.add(keep);
  }

  const out: string[] = [];
  for (const id of activeIds) {
    if (active.has(id) && !out.includes(id)) out.push(id);
  }
  for (const id of active) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
