"use client";

import { useSearchParams } from "next/navigation";
import GearTabLayout from "./GearTabLayout";
import MainTabLayout from "./MainTabLayout";

export function MainContent() {
  const search = useSearchParams();
  const root = search.get("root") ?? "main";

  if (root === "gear") {
    return <GearTabLayout />;
  }

  return <MainTabLayout />;
}
