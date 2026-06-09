"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { setSkills } from "@/app/domain/skill/skills";
import { setPassiveSkills } from "@/app/domain/skill/passiveSkills";
import { setInnerWays } from "@/app/domain/skill/innerWays";
import { setDefaultRotations } from "@/app/domain/skill/defaultRotations";
import { setMartialArts } from "@/app/domain/skill/types";

export function StaticDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("static_data").select("*");

        if (error) {
          throw new Error(error.message);
        }

        if (data && data.length > 0) {
          // Process each key and update the mutable stores
          for (const row of data) {
            switch (row.key) {
              case "skills":
                setSkills(row.data);
                break;
              case "passiveSkills":
                setPassiveSkills(row.data);
                break;
              case "innerWays":
                setInnerWays(row.data);
                break;
              case "defaultRotations":
                setDefaultRotations(row.data);
                break;
              case "martialArts":
                setMartialArts(row.data);
                break;
            }
          }
        } else {
          // If the database is completely empty, it might mean we haven't seeded yet.
          // In that case, we can just use the initial fallback data from the local JSONs.
          console.warn("No static data found in Supabase. Using local JSON fallbacks.");
        }
      } catch (err: any) {
        console.error("Failed to load static data from Supabase:", err);
        // Fallback to local JSON on error so the app doesn't break
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

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground">
        <p className="text-destructive">Failed to load data: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
