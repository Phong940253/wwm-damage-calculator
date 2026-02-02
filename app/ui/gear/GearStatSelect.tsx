"use client";

import type { InputStats } from "@/app/types";
import { STAT_GROUPS } from "@/app/constants";
import { getStatLabel } from "@/app/utils/statLabel";

export type GearStatKey = keyof InputStats;

const STAT_OPTION_GROUPS: { label: string; options: GearStatKey[] }[] = [
    ...Object.entries(STAT_GROUPS).map(([label, options]) => ({
        label,
        options: options as GearStatKey[],
    })),
    {
        label: "Special",
        options: [
            "ChargeSkillDamageBoost",
            "BallisticSkillDamageBoost",
            "PursuitSkillDamageBoost",
            "ArtOfSwordDMGBoost",
            "ArtOfSpearDMGBoost",
            "ArtOfFanDMGBoost",
            "ArtOfUmbrellaDMGBoost",
            "ArtOfHorizontalBladeDMGBoost",
            "ArtOfMoBladeDMGBoost",
            "ArtOfDualBladesDMGBoost",
            "ArtOfRopeDartDMGBoost",
        ],
    },
];

export function GearStatSelect(props: {
    value: GearStatKey;
    onChange: (value: GearStatKey) => void;
    className?: string;
}) {
    return (
        <select
            className={props.className ?? "flex-1 border rounded px-2 py-1"}
            value={props.value}
            onChange={e => props.onChange(e.target.value as GearStatKey)}
        >
            {STAT_OPTION_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                    {Array.from(new Set(group.options)).map(statKey => (
                        <option key={statKey} value={statKey}>
                            {getStatLabel(String(statKey))}
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
}
