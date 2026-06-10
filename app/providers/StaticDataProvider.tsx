"use client";

import React, { useEffect, useRef, useState } from "react";
import { setSkills } from "@/app/domain/skill/skills";
import { setPassiveSkills } from "@/app/domain/skill/passiveSkills";
import { setInnerWays } from "@/app/domain/skill/innerWays";
import { setDefaultRotations } from "@/app/domain/skill/defaultRotations";
import { setMartialArts } from "@/app/domain/skill/types";
import { createClient } from "@/app/utils/supabase/client";
import {
  getStaticDataCache,
  setStaticDataCache,
  updateStaticDataCache,
  removeStaticDataCache,
  type StaticDataCacheRow,
} from "@/app/utils/staticDataCache";

function applyStaticData(rows: StaticDataCacheRow[]) {
  for (const row of rows) {
    switch (row.key) {
      case "skills":
        setSkills(row.data as import("@/app/domain/skill/types").Skill[]);
        break;
      case "passiveSkills":
        setPassiveSkills(row.data as import("@/app/domain/skill/passiveSkillTypes").PassiveSkill[]);
        break;
      case "innerWays":
        setInnerWays(row.data as import("@/app/domain/skill/passiveSkillTypes").InnerWay[]);
        break;
      case "defaultRotations":
        setDefaultRotations(row.data as import("@/app/types").Rotation[]);
        break;
      case "martialArts":
        setMartialArts(row.data as import("@/app/domain/skill/types").MartialArt[]);
        break;
    }
  }
}

export function StaticDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return;
    appliedRef.current = true;

    // Step 1: apply cached data immediately (skip loading spinner on repeat visits)
    const cache = getStaticDataCache();
    if (cache && cache.rows.length > 0) {
      applyStaticData(cache.rows);
      setIsLoading(false);
    }

    // Step 2: fetch fresh data from API (background if we had cache, blocking if not)
    async function fetchFromApi() {
      try {
        const res = await fetch("/api/admin/static-data");
        if (!res.ok) throw new Error("Failed to fetch static data");

        const { data } = await res.json();
        if (data && Array.isArray(data)) {
          const rows = data as StaticDataCacheRow[];
          applyStaticData(rows);
          setStaticDataCache(rows);
        } else {
          console.warn("No static data found in database. Using local JSON fallbacks.");
        }
      } catch (err: unknown) {
        console.error("Failed to load static data from API:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFromApi();

    // Step 3: subscribe to Supabase Realtime for live updates
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    try {
      supabase = createClient();
      channel = supabase
        .channel("static_data_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "static_data" },
          (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload;

            if (eventType === "DELETE") {
              const key = (oldRow as { key?: string })?.key;
              if (key) {
                removeStaticDataCache(key);
                fetchFromApi();
              }
              return;
            }

            const row = newRow as { key?: string; data?: unknown };
            if (row?.key && row.data !== undefined) {
              updateStaticDataCache(row.key, row.data);
              applyStaticData([{ key: row.key, data: row.data }]);
            }
          },
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime unavailable:", err);
    }

    return () => {
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // cleanup must never throw
        }
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground">Loading game data...</p>
      </div>
    );
  }

  return <>{children}</>;
}
