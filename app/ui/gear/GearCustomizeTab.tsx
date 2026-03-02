"use client";

import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useGear } from "../../providers/GearContext";
import GearCard from "./GearCard";
import GearForm from "./GearForm";
import GearOptimizeDialog from "./GearOptimizeDialog";
import GearOptimizeProgressDialog from "./GearOptimizeProgressDialog";
import { CustomGear, InputStats, ElementStats, GearSlot, Rotation } from "@/app/types";
import { GEAR_SLOTS } from "@/app/constants";
import { getStatLabel } from "@/app/utils/statLabel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGearOptimize } from "../../hooks/useGearOptimize";
import { useI18n } from "@/app/providers/I18nProvider";

/* =======================
   Helpers
======================= */

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return next;
}

function getStatTotal(gear: CustomGear, stat: string): number {
  let total = 0;
  const eq = (v?: string | number) => String(v) === stat;

  if (gear.main && eq(gear.main.stat)) total += gear.main.value;
  gear.mains?.forEach((m) => eq(m.stat) && (total += m.value));
  gear.subs?.forEach((s) => eq(s.stat) && (total += s.value));
  if (gear.addition && eq(gear.addition.stat)) {
    total += gear.addition.value;
  }

  return total;
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

function toSortedCsv(values: Iterable<string>): string {
  return Array.from(values).sort().join(",");
}

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function canonicalizeSearchParams(sp: URLSearchParams): string {
  const entries = Array.from(sp.entries());
  entries.sort(([ak, av], [bk, bv]) => {
    if (ak === bk) return av.localeCompare(bv);
    return ak.localeCompare(bk);
  });
  return new URLSearchParams(entries).toString();
}

/* =======================
   Props
======================= */

interface Props {
  stats: InputStats;
  elementStats: ElementStats;
  rotation?: Rotation;
}

/* =======================
   Component
======================= */

export default function GearCustomizeTab({ stats, elementStats, rotation }: Props) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      customGear: "Trang bị tùy chỉnh",
      optimize: "Tối ưu",
      addGear: "+ Thêm trang bị",
      deleteAll: "Xóa tất cả",
      confirmDeleteAllTitle: "Xóa toàn bộ trang bị?",
      confirmDeleteAllDesc: "Hành động này sẽ xóa toàn bộ trang bị tùy chỉnh và không thể hoàn tác.",
      cancel: "Hủy",
      confirmDelete: "Xóa",
      slot: "Vị trí",
      stat: "Chỉ số",
      searchStat: "Tìm chỉ số...",
      clearFilter: "Xóa bộ lọc",
      sort: "Sắp xếp",
      noSorting: "Không sắp xếp",
      desc: "↓ Giảm dần",
      asc: "↑ Tăng dần",
      clearSort: "Xóa sắp xếp",
      loadingMoreGear: "Đang tải thêm trang bị",
      editGear: "Sửa trang bị",
      addNewGear: "Thêm trang bị mới",
    }
    : {
      customGear: "Custom Gear",
      optimize: "Optimize",
      addGear: "+ Add Gear",
      deleteAll: "Delete All",
      confirmDeleteAllTitle: "Delete all gear?",
      confirmDeleteAllDesc: "This action will remove all custom gear and cannot be undone.",
      cancel: "Cancel",
      confirmDelete: "Delete",
      slot: "Slot",
      stat: "Stat",
      searchStat: "Search stat...",
      clearFilter: "Clear Filter",
      sort: "Sort",
      noSorting: "No sorting",
      desc: "↓ Desc",
      asc: "↑ Asc",
      clearSort: "Clear Sort",
      loadingMoreGear: "Loading more gear",
      editGear: "Edit Gear",
      addNewGear: "Add New Gear",
    };

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { customGears, setCustomGears, equipped, setEquipped } = useGear();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomGear | null>(null);
  const [optOpen, setOptOpen] = useState(false);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [maxDisplay, setMaxDisplay] = useState(200);

  /* ===== Filter state ===== */

  const [slotFilter, setSlotFilter] = useState<Set<GearSlot>>(new Set());
  const [statFilter, setStatFilter] = useState<Set<string>>(new Set());

  const [pinSlot, setPinSlot] = useState(false);
  const [pinStat, setPinStat] = useState(false);
  const [pinSort, setPinSort] = useState(false);

  const [statSearch, setStatSearch] = useState("");

  const [sortStat, setSortStat] = useState("none");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [urlHydrated, setUrlHydrated] = useState(false);

  /* ===== Infinite list ===== */

  const PAGE_SIZE = 16;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleEdit = useCallback((gear: CustomGear) => {
    setEditing(gear);
    setOpen(true);
  }, []);

  const handleDelete = useCallback(
    (gearId: string) => {
      setCustomGears((x) => x.filter((i) => i.id !== gearId));
    },
    [setCustomGears]
  );

  /* =======================
     URL sync (filter + sort)
  ======================= */

  const allowedSlotKeys = useMemo(() => {
    return new Set<string>(GEAR_SLOTS.map((s) => String(s.key)));
  }, []);

  useEffect(() => {
    const urlSlots = new Set<GearSlot>(
      parseCsvParam(searchParams.get("gSlot"))
        .filter((s) => allowedSlotKeys.has(s))
        .map((s) => s as GearSlot)
    );

    const urlStats = new Set<string>(parseCsvParam(searchParams.get("gStat")));

    const urlSortStat = searchParams.get("gSort") ?? "none";
    const urlSortDir = searchParams.get("gDir") === "asc" ? "asc" : "desc";

    setSlotFilter((prev) => (setsEqual(prev, urlSlots) ? prev : urlSlots));
    setStatFilter((prev) => (setsEqual(prev, urlStats) ? prev : urlStats));
    setSortStat((prev) => (prev === urlSortStat ? prev : urlSortStat));
    setSortDir((prev) => (prev === urlSortDir ? prev : urlSortDir));

    // Prevent the URL-write effect from running with pre-hydration defaults.
    setUrlHydrated(true);
  }, [searchParams, allowedSlotKeys]);

  useEffect(() => {
    if (!urlHydrated) return;

    const next = new URLSearchParams(searchParams.toString());

    const slotCsv = toSortedCsv(Array.from(slotFilter).map(String));
    if (slotFilter.size > 0) next.set("gSlot", slotCsv);
    else next.delete("gSlot");

    const statCsv = toSortedCsv(statFilter);
    if (statFilter.size > 0) next.set("gStat", statCsv);
    else next.delete("gStat");

    if (sortStat && sortStat !== "none") {
      next.set("gSort", sortStat);
      next.set("gDir", sortDir);
    } else {
      next.delete("gSort");
      next.delete("gDir");
    }

    const nextQuery = canonicalizeSearchParams(next);
    const currentQuery = canonicalizeSearchParams(
      new URLSearchParams(searchParams.toString())
    );
    if (nextQuery === currentQuery) return;

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [urlHydrated, slotFilter, statFilter, sortStat, sortDir, pathname, router, searchParams]);

  const filteredGears = useMemo(() => {
    let list = [...customGears];

    if (slotFilter.size > 0) {
      list = list.filter((g) => slotFilter.has(g.slot));
    }

    if (statFilter.size > 0) {
      list = list.filter((g) =>
        Array.from(statFilter).some((stat) => getStatTotal(g, stat) > 0)
      );
    }

    return list;
  }, [customGears, slotFilter, statFilter]);

  const [perSlotCap, setPerSlotCap] = useState<number>(0);

  const optimizeOptions = useMemo(() => {
    return {
      candidateGears: filteredGears,
      slotsToOptimize: slotFilter.size > 0 ? Array.from(slotFilter) : undefined,
      reducePerSlotCap: perSlotCap,
    };
  }, [filteredGears, slotFilter, perSlotCap]);

  const opt = useGearOptimize(
    stats,
    elementStats,
    customGears,
    equipped,
    rotation,
    optimizeOptions
  );

  useEffect(() => {
    if (optOpen) {
      opt.run(maxDisplay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optOpen]);

  const apply = (sel: Partial<Record<GearSlot, CustomGear>>) => {
    setEquipped((prev) => {
      const next: Partial<Record<GearSlot, string>> = { ...prev };

      // If user filters slots in the optimizer UI, results only include those slots.
      // Preserve other equipped slots (don't wipe them).
      const optimizedSlots: GearSlot[] =
        slotFilter.size > 0
          ? Array.from(slotFilter)
          : GEAR_SLOTS.map(({ key }) => key);

      for (const slot of optimizedSlots) {
        const gear = sel[slot];
        if (gear) {
          next[slot] = gear.id;
        } else {
          delete next[slot];
        }
      }

      return next;
    });
    setOptOpen(false);
  };

  /* =======================
     Collect stat options
  ======================= */

  const statOptions = useMemo(() => {
    const set = new Set<string>();
    customGears.forEach((g) => {
      if (g.main) set.add(String(g.main.stat));
      g.mains?.forEach((m) => set.add(String(m.stat)));
      g.subs?.forEach((s) => set.add(String(s.stat)));
      if (g.addition) set.add(String(g.addition.stat));
    });
    return Array.from(set).sort();
  }, [customGears]);

  const filteredStatOptions = useMemo(() => {
    if (!statSearch) return statOptions;
    return statOptions.filter((s) =>
      s.toLowerCase().includes(statSearch.toLowerCase())
    );
  }, [statOptions, statSearch]);

  /* =======================
     Filter + Sort gears
  ======================= */

  const displayGears = useMemo(() => {
    const list = [...filteredGears];

    /* ---- Sort ---- */
    if (sortStat !== "none") {
      list.sort((a, b) => {
        const va = getStatTotal(a, sortStat);
        const vb = getStatTotal(b, sortStat);

        if (va === vb) {
          // stable fallback: name
          return a.name.localeCompare(b.name);
        }

        return sortDir === "asc" ? va - vb : vb - va;
      });
    }

    return list;
  }, [filteredGears, sortStat, sortDir]);

  const filterKey = useMemo(() => {
    const slotCsv = toSortedCsv(Array.from(slotFilter).map(String));
    const statCsv = toSortedCsv(statFilter);
    return `${slotCsv}|${statCsv}|${sortStat}|${sortDir}|${displayGears.length}`;
  }, [slotFilter, statFilter, sortStat, sortDir, displayGears.length]);

  useEffect(() => {
    // Reset pagination when the result set changes (filters/sort/custom gear changes)
    setVisibleCount(PAGE_SIZE);
  }, [filterKey]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    if (visibleCount >= displayGears.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, displayGears.length));
      },
      {
        root: null,
        rootMargin: "400px 0px",
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, displayGears.length]);

  const visibleGears = useMemo(() => {
    return displayGears.slice(0, visibleCount);
  }, [displayGears, visibleCount]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">{text.customGear}</h3>
        <div className="flex flex-wrap gap-2">
          <Button data-tour="gear-optimize-open" variant="outline" onClick={() => setOptOpen(true)}>
            {text.optimize}
          </Button>
          <Button
            data-tour="gear-add-open"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            {text.addGear}
          </Button>
          {/* Button delete all */}
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setConfirmDeleteAllOpen(true)}
            disabled={customGears.length === 0}
          >
            {text.deleteAll}
          </Button>
        </div>
      </div>

      {/* =======================
          FILTER BAR (CÁCH 3)
      ======================= */}
      <div className="flex flex-wrap gap-2">
        {/* SLOT FILTER */}
        <div className="relative group inline-block">
          <Button
            variant={slotFilter.size > 0 ? "default" : "outline"}
            onClick={() => setPinSlot((p) => !p)}
          >
            {text.slot}
            {slotFilter.size > 0 && ` (${slotFilter.size})`}
            {pinSlot && " 📌"}
          </Button>

          {/* 🔥 Hover buffer zone (KEY PART) */}
          <div className="absolute left-0 top-full h-3 w-full" />

          <div
            className={`
          absolute z-50 top-full left-0 mt-2 w-56 max-w-[85vw]
      rounded-lg border bg-card shadow-lg
      p-2 space-y-1
      ${pinSlot ? "block" : "hidden group-hover:block"}
    `}
          >
            {GEAR_SLOTS.map((s) => (
              <label
                key={s.key}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={slotFilter.has(s.key)}
                  onChange={() =>
                    setSlotFilter((prev) => toggleSet(prev, s.key))
                  }
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        {/* STAT FILTER */}
        <div className="relative group inline-block">
          <Button
            variant={statFilter.size > 0 ? "default" : "outline"}
            onClick={() => setPinStat((p) => !p)}
          >
            {text.stat}
            {statFilter.size > 0 && ` (${statFilter.size})`}
            {pinStat && " 📌"}
          </Button>
          {/* Hover buffer */}
          <div className="absolute left-0 top-full h-3 w-full" />

          <div
            className={`
    absolute z-50 top-full left-0 mt-2 w-64 max-w-[85vw]
    rounded-lg border bg-card shadow-lg
    p-2 space-y-1
    ${pinStat ? "block" : "hidden group-hover:block"}
  `}
          >
            <input
              className="w-full mb-2 px-2 py-1 rounded border bg-background text-xs"
              placeholder={text.searchStat}
              value={statSearch}
              onChange={(e) => setStatSearch(e.target.value)}
            />

            <div className="space-y-1">
              {filteredStatOptions.map((stat) => (
                <label
                  key={stat}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={statFilter.has(stat)}
                    onChange={() =>
                      setStatFilter((prev) => toggleSet(prev, stat))
                    }
                  />
                  {getStatLabel(stat, elementStats)}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* CLEAR */}
        {(slotFilter.size > 0 || statFilter.size > 0) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSlotFilter(new Set());
              setStatFilter(new Set());
              setStatSearch("");
            }}
          >
            {text.clearFilter}
          </Button>
        )}

        {/* SORT */}
        <div className="relative group inline-block">
          <Button
            variant={sortStat !== "none" ? "default" : "outline"}
            onClick={() => setPinSort((p) => !p)}
          >
            {text.sort}
            {sortStat !== "none" && ` (${sortStat})`}
            {pinSort && " 📌"}
          </Button>

          {/* Hover buffer */}
          <div className="absolute left-0 top-full h-3 w-full" />

          <div
            className={`
      absolute z-50 top-full left-0 mt-2 w-56
      rounded-lg border bg-card shadow-lg
      p-2 space-y-2
          ${pinSort ? "block" : "hidden group-hover:block"}
            `}
          >
            {/* Sort stat */}
            <select
              className="w-full px-2 py-1 rounded border bg-background text-sm"
              value={sortStat}
              onChange={(e) => setSortStat(e.target.value)}
            >
              <option value="none">{text.noSorting}</option>
              {statOptions.map((stat) => (
                <option key={stat} value={stat}>
                  {getStatLabel(stat, elementStats)}
                </option>
              ))}
            </select>

            {/* Direction */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={sortDir === "desc" ? "default" : "outline"}
                onClick={() => setSortDir("desc")}
                className="flex-1"
              >
                {text.desc}
              </Button>
              <Button
                size="sm"
                variant={sortDir === "asc" ? "default" : "outline"}
                onClick={() => setSortDir("asc")}
                className="flex-1"
              >
                {text.asc}
              </Button>
            </div>

            {/* Reset */}
            {sortStat !== "none" && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSortStat("none");
                  setSortDir("desc");
                }}
              >
                {text.clearSort}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* =======================
          GEAR LIST
      ======================= */}
      <div className="grid items-stretch grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visibleGears.map((g) => (
          <GearCard
            key={g.id}
            gear={g}
            elementStats={elementStats}
            stats={stats}
            rotation={rotation}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Infinite-scroll sentinel */}
      {visibleCount < displayGears.length && (
        <div className="flex justify-center">
          <div
            ref={loadMoreRef}
            className="h-10 w-full"
            aria-label={text.loadingMoreGear}
          />
        </div>
      )}

      {/* =======================
          DIALOGS
      ======================= */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] w-[98vw] max-w-[98vw] p-4 sm:max-h-[90dvh] sm:w-[96vw] sm:max-w-2xl sm:p-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? text.editGear : text.addNewGear}</DialogTitle>
          </DialogHeader>
          <GearForm initialGear={editing} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteAllOpen} onOpenChange={setConfirmDeleteAllOpen}>
        <DialogContent className="w-[92vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{text.confirmDeleteAllTitle}</DialogTitle>
            <DialogDescription>{text.confirmDeleteAllDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteAllOpen(false)}>
              {text.cancel}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                setCustomGears([]);
                setConfirmDeleteAllOpen(false);
              }}
            >
              {text.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GearOptimizeProgressDialog
        open={opt.loading}
        progress={opt.progress}
        onCancel={opt.cancel}
      />

      <GearOptimizeDialog
        open={optOpen}
        onOpenChange={setOptOpen}
        loading={opt.loading}
        error={opt.error}
        results={opt.results}
        baseDamage={opt.baseDamage}
        combos={opt.combos}
        stats={stats}
        elementStats={elementStats}
        rotation={rotation}
        maxDisplay={maxDisplay}
        setMaxDisplay={setMaxDisplay}
        perSlotCap={perSlotCap}
        setPerSlotCap={setPerSlotCap}
        onRecalculate={() => opt.run(maxDisplay)}
        onApply={apply}
        equipped={equipped}
        customGears={customGears}
      />
    </div>
  );
}
