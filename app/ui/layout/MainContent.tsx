"use client";

import { useSearchParams } from "next/navigation";
import { GearProvider } from "@/app/providers/GearContext";
import GearTabLayout from "./GearTabLayout";
import MainTabLayout from "./MainTabLayout";

export function MainContent() {
  const search = useSearchParams();
  const root = search.get("root") ?? "main";

  if (root === "gear") {
    return (
      <GearProvider>
        <GearTabLayout />
      </GearProvider>
    );
  }

  return <MainTabLayout />;
}
