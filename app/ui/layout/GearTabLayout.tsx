"use client";

import { useSearchParams } from "next/navigation";
import GearCustomizeTab from "../gear/GearCustomizeTab";
import GearEquippedTab from "../gear/GearEquippedTab";
import GearCompareTab from "../gear/GearCompareTab";
import { useDMGOptimizer } from "@/app/hooks/useDMGOptimizer";
import { useRotation } from "@/app/hooks/useRotation";
import { INITIAL_ELEMENT_STATS, INITIAL_STATS } from "@/app/constants";

export default function GearTabLayout() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "custom";

  // stats & elementStats vẫn cần cho customize / compare
  const { stats, elementStats } = useDMGOptimizer(
    INITIAL_STATS,
    INITIAL_ELEMENT_STATS
  );

  const { selectedRotation } = useRotation();

  return (
    <div
      className="
        h-[calc(100dvh-150px)]
        sm:h-[calc(100dvh-165px)]
        lg:h-[calc(100dvh-180px)]
        overflow-y-auto
        px-1.5 sm:px-2
        scrollbar-thin scrollbar-thumb-zinc-600/40
      "
    >
      {tab === "custom" && (
        <GearCustomizeTab stats={stats} elementStats={elementStats} rotation={selectedRotation} />
      )}

      {tab === "equipped" && <GearEquippedTab />}

      {tab === "compare" && (
        <GearCompareTab stats={stats} elementStats={elementStats} rotation={selectedRotation} />
      )}
    </div>
  );
}
