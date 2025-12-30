"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TabButton } from "@/components/ui/TabButton";

export function StatusBar() {
  const router = useRouter();
  const search = useSearchParams();

  const root = search.get("root") ?? "main";
  const tab = search.get("tab") ?? (root === "main" ? "stats" : "custom");

  const set = (r: string, t: string) => {
    router.replace(`?root=${r}&tab=${t}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-6 border-b pb-3">
      {/* LEFT — ROOT */}
      <div className="flex gap-1">
        <TabButton
          active={root === "main"}
          onClick={() => set("main", "stats")}
        >
          Main
        </TabButton>
        <TabButton
          active={root === "gear"}
          onClick={() => set("gear", "custom")}
        >
          Gear
        </TabButton>
      </div>

      {/* CENTER — SUB */}
      <div className="flex gap-1">
        {root === "main" && (
          <>
            <TabButton
              active={tab === "stats"}
              onClick={() => set("main", "stats")}
            >
              Stats
            </TabButton>
            <TabButton
              active={tab === "import"}
              onClick={() => set("main", "import")}
            >
              Import / Export
            </TabButton>
          </>
        )}

        {root === "gear" && (
          <>
            <TabButton
              active={tab === "custom"}
              onClick={() => set("gear", "custom")}
            >
              Customize
            </TabButton>
            <TabButton
              active={tab === "equipped"}
              onClick={() => set("gear", "equipped")}
            >
              Equipped
            </TabButton>
            <TabButton
              active={tab === "compare"}
              onClick={() => set("gear", "compare")}
            >
              Compare
            </TabButton>
          </>
        )}
      </div>
    </div>
  );
}
