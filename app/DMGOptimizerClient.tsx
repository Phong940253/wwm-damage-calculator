"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSearchParams, useRouter } from "next/navigation";
import MainTabLayout from "./ui/layout/MainTabLayout";
import GearTabLayout from "./ui/layout/GearTabLayout";

export default function DMGOptimizerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootTab = searchParams.get("root") ?? "main";

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Swords className="text-emerald-500" />
          <h1 className="text-2xl font-bold">
            Where Winds Meet – DMG Optimizer
          </h1>
          <Badge>Realtime</Badge>
        </div>

        {/* ROOT TABS */}
        <Tabs
          value={rootTab}
          onValueChange={(v) =>
            router.replace(`?root=${v}`, { scroll: false })
          }
        >
          <TabsList>
            <TabsTrigger value="main">Main</TabsTrigger>
            <TabsTrigger value="gear">Gear</TabsTrigger>
          </TabsList>

          <TabsContent value="main">
            <MainTabLayout />
          </TabsContent>

          <TabsContent value="gear">
            <GearTabLayout />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
