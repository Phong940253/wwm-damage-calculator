"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TabButton } from "@/components/ui/TabButton";
import {
  LayoutDashboard,
  Shield,
  BarChart3,
  ArrowLeftRight,
  SlidersHorizontal,
  PackageCheck,
  GitCompare,
  Zap,
} from "lucide-react";

export function StatusBar() {
  const router = useRouter();
  const search = useSearchParams();

  const root = search.get("root") ?? "main";
  const tab = search.get("tab") ?? (root === "main" ? "stats" : "custom");

  const set = (r: string, t: string) => {
    router.replace(`?root=${r}&tab=${t}`, { scroll: false });
  };

  return (
    <div
      className="
        grid grid-cols-[1fr_auto_1fr]
        items-center
        border-b pb-3
      "
    >
      {/* LEFT — ROOT */}
      <div className="flex gap-1 justify-start">
        <TabButton
          active={root === "main"}
          onClick={() => set("main", "stats")}
          title="Main"
        >
          <LayoutDashboard size={18} />
        </TabButton>

        <TabButton
          active={root === "gear"}
          onClick={() => set("gear", "custom")}
          title="Gear"
        >
          <Shield size={18} />
        </TabButton>
      </div>

      {/* CENTER — SUB */}
      <div className="flex justify-center gap-1">
        {root === "main" && (
          <>
            <TabButton
              active={tab === "stats"}
              onClick={() => set("main", "stats")}
              title="Stats"
            >
              <BarChart3 size={18} />
            </TabButton>

            <TabButton
              active={tab === "rotation"}
              onClick={() => set("main", "rotation")}
              title="Rotation"
            >
              <Zap size={18} />
            </TabButton>

            <TabButton
              active={tab === "import"}
              onClick={() => set("main", "import")}
              title="Import / Export"
            >
              <ArrowLeftRight size={18} />
            </TabButton>
          </>
        )}

        {root === "gear" && (
          <>
            <TabButton
              active={tab === "custom"}
              onClick={() => set("gear", "custom")}
              title="Customize Gear"
            >
              <SlidersHorizontal size={18} />
            </TabButton>

            <TabButton
              active={tab === "equipped"}
              onClick={() => set("gear", "equipped")}
              title="Equipped Gear"
            >
              <PackageCheck size={18} />
            </TabButton>

            <TabButton
              active={tab === "compare"}
              onClick={() => set("gear", "compare")}
              title="Compare Gear"
            >
              <GitCompare size={18} />
            </TabButton>
          </>
        )}
      </div>

      {/* RIGHT — balancing */}
      <div />
    </div>
  );
}
