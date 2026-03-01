"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TabButton } from "@/components/ui/TabButton";
import { ThemeToggle } from "@/components/theme-toggle";
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
        flex flex-col gap-2
        border-b pb-3
        sm:grid sm:grid-cols-[1fr_auto_1fr]
        sm:items-center
      "
    >
      {/* LEFT — ROOT */}
      <div className="flex justify-start gap-1 overflow-x-auto pb-0.5 sm:overflow-visible sm:pb-0">
        <TabButton
          active={root === "main"}
          onClick={() => set("main", "stats")}
          title="Main"
          data-tour="tab-main-root"
        >
          <LayoutDashboard size={18} />
        </TabButton>

        <TabButton
          active={root === "gear"}
          onClick={() => set("gear", "custom")}
          title="Gear"
          data-tour="tab-gear-root"
        >
          <Shield size={18} />
        </TabButton>
      </div>

      {/* CENTER — SUB */}
      <div className="flex justify-start gap-1 overflow-x-auto pb-0.5 sm:justify-center sm:overflow-visible sm:pb-0">
        {root === "main" && (
          <>
            <TabButton
              active={tab === "stats"}
              onClick={() => set("main", "stats")}
              title="Stats"
              data-tour="tab-stats"
            >
              <BarChart3 size={18} />
            </TabButton>

            <TabButton
              active={tab === "rotation"}
              onClick={() => set("main", "rotation")}
              title="Rotation"
              data-tour="tab-rotation"
            >
              <Zap size={18} />
            </TabButton>

            <TabButton
              active={tab === "import"}
              onClick={() => set("main", "import")}
              title="Import / Export"
              data-tour="tab-import"
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
      <div className="flex justify-start sm:justify-end">
        <ThemeToggle />
      </div>
    </div>
  );
}
