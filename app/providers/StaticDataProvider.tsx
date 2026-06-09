"use client";

import React, { useEffect, useState } from "react";
import { setSkills } from "@/app/domain/skill/skills";
import { setPassiveSkills } from "@/app/domain/skill/passiveSkills";
import { setInnerWays } from "@/app/domain/skill/innerWays";
import { setDefaultRotations } from "@/app/domain/skill/defaultRotations";
import { setMartialArts } from "@/app/domain/skill/types";

export function StaticDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch via internal API which uses Supabase
        const res = await fetch("/api/admin/static-data");
        if (!res.ok) {
          throw new Error("Failed to fetch static data");
        }

        const { data } = await res.json();
        if (data && Array.isArray(data)) {
          // Process each key and update the mutable stores
          for (const row of data as Array<{ key: string; data: unknown }>) {
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
        } else {
          console.warn("No static data found in database. Using local JSON fallbacks.");
        }
      } catch (err: unknown) {
        console.error("Failed to load static data from API:", err);
        // Fallback to local JSON on error is handled by the initial state of the domain files
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
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
