"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GearEquippedTab from "./GearEquippedTab";
import GearCustomizeTab from "./GearCustomizeTab";

export default function GearPanel() {
  return (
    <Tabs defaultValue="equipped" className="space-y-4">
      <TabsList>
        <TabsTrigger value="equipped">Gear Equipped</TabsTrigger>
        <TabsTrigger value="custom">Gear Customize</TabsTrigger>
      </TabsList>

      <TabsContent value="equipped">
        <GearEquippedTab />
      </TabsContent>

      <TabsContent value="custom">
        <GearCustomizeTab />
      </TabsContent>
    </Tabs>
  );
}
