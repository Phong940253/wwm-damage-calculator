"use client";

import { useSearchParams } from "next/navigation";
import GearCustomizeTab from "../gear/GearCustomizeTab";
import GearEquippedTab from "../gear/GearEquippedTab";
import GearCompareTab from "../gear/GearCompareTab";
import { GearProvider } from "@/app/providers/GearContext";
import { useDMGOptimizer } from "@/app/hooks/useDMGOptimizer";
import { INITIAL_ELEMENT_STATS, INITIAL_STATS } from "@/app/constants";

export default function GearTabLayout() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "custom";

  // stats & elementStats vẫn cần cho customize / compare
  const { stats, elementStats } = useDMGOptimizer(
    INITIAL_STATS,
    INITIAL_ELEMENT_STATS
  );

  return (
    <GearProvider>
      <div
        className="
          h-[calc(100vh-180px)]
          overflow-y-auto
          scrollbar-thin scrollbar-thumb-zinc-600/40
        "
      >
        {tab === "custom" && (
          <GearCustomizeTab stats={stats} elementStats={elementStats} />
        )}

        {tab === "equipped" && <GearEquippedTab />}

        {tab === "compare" && (
          <GearCompareTab stats={stats} elementStats={elementStats} />
        )}
      </div>
    </GearProvider>
  );
}
