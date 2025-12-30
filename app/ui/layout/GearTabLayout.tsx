"use client";

import GearCustomizeTab from "../gear/GearCustomizeTab";
import GearEquippedTab from "../gear/GearEquippedTab";
import GearCompareTab from "../gear/GearCompareTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GearProvider } from "@/app/providers/GearContext";
import { useDMGOptimizer } from "@/app/hooks/useDMGOptimizer";
import { INITIAL_ELEMENT_STATS, INITIAL_STATS } from "@/app/constants";

export default function GearTabLayout() {
  const { stats, elementStats } = useDMGOptimizer(
    INITIAL_STATS,
    INITIAL_ELEMENT_STATS
  );

  return (
    <GearProvider>
      <Tabs defaultValue="custom">
        <TabsList>
          <TabsTrigger value="custom">Customize</TabsTrigger>
          <TabsTrigger value="equipped">Equipped</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="custom">
          <GearCustomizeTab stats={stats} elementStats={elementStats} />
        </TabsContent>

        <TabsContent value="equipped">
          <GearEquippedTab />
        </TabsContent>

        <TabsContent value="compare">
          <GearCompareTab stats={stats} elementStats={elementStats} />
        </TabsContent>
      </Tabs>
    </GearProvider>
  );
}
