"use client";

import type { Dispatch, SetStateAction } from "react";
import type { InputStats } from "@/app/types";

export type GearStatKey = keyof InputStats;

export type GearStatRow = {
  id: string;
  stat: GearStatKey;
  value: number;
};

export type DragSource = "mains" | "subs" | "addition";

export type DraggedStat =
  | { source: "mains" | "subs"; rowId: string }
  | { source: "addition" };

export type DragOver =
  | { zone: Exclude<DragSource, "addition">; insertIndex: number }
  | { zone: "addition" }
  | null;

const readDraggedFromDataTransfer = (
  e: React.DragEvent
): DraggedStat | null => {
  const raw = e.dataTransfer.getData("application/wwm-gear-stat");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraggedStat;
    if (!parsed || typeof parsed !== "object" || !("source" in parsed))
      return null;
    if (parsed.source === "addition") return { source: "addition" };
    if (parsed.source === "mains" || parsed.source === "subs") {
      if (typeof (parsed as any).rowId !== "string") return null;
      return { source: parsed.source, rowId: (parsed as any).rowId };
    }
    return null;
  } catch {
    return null;
  }
};

export type GearStatDnDApi = {
  dragOver: DragOver;
  setDragOver: Dispatch<SetStateAction<DragOver>>;
  startDrag: (d: DraggedStat) => (e: React.DragEvent) => void;
  endDrag: () => void;
  allowDrop: (e: React.DragEvent) => void;
  computeInsertIndexFromPointer: (
    e: React.DragEvent,
    rowElement: HTMLElement,
    rowIndex: number
  ) => number;
  dropOnList: (
    targetList: Exclude<DragSource, "addition">,
    insertIndex?: number
  ) => (e: React.DragEvent) => void;
  dropOnAddition: () => (e: React.DragEvent) => void;
};

type Params = {
  mains: GearStatRow[];
  setMains: Dispatch<SetStateAction<GearStatRow[]>>;
  subs: GearStatRow[];
  setSubs: Dispatch<SetStateAction<GearStatRow[]>>;
  addition: GearStatRow | null;
  setAddition: Dispatch<SetStateAction<GearStatRow | null>>;
  dragged: DraggedStat | null;
  setDragged: Dispatch<SetStateAction<DraggedStat | null>>;
  dragOver: DragOver;
  setDragOver: Dispatch<SetStateAction<DragOver>>;
};

export const useGearStatDnD = (p: Params): GearStatDnDApi => {
  const findRowIndexById = (list: GearStatRow[], rowId: string) =>
    list.findIndex((r) => r.id === rowId);

  const getDraggedItem = (d: DraggedStat): GearStatRow | null => {
    if (d.source === "addition") return p.addition;
    const list = d.source === "mains" ? p.mains : p.subs;
    const idx = findRowIndexById(list, d.rowId);
    return idx >= 0 ? list[idx] : null;
  };

  const removeFromSource = (d: DraggedStat) => {
    if (d.source === "addition") {
      p.setAddition(null);
      return;
    }

    if (d.source === "mains") {
      p.setMains((prev) => prev.filter((r) => r.id !== d.rowId));
      return;
    }

    p.setSubs((prev) => prev.filter((r) => r.id !== d.rowId));
  };

  const insertIntoList = (
    target: Exclude<DragSource, "addition">,
    item: GearStatRow,
    insertIndex?: number
  ) => {
    const setter = target === "mains" ? p.setMains : p.setSubs;
    setter((prev) => {
      const next = [...prev];
      if (
        insertIndex === undefined ||
        insertIndex < 0 ||
        insertIndex > next.length
      ) {
        next.push(item);
      } else {
        next.splice(insertIndex, 0, item);
      }
      return next;
    });
  };

  const startDrag = (d: DraggedStat) => (e: React.DragEvent) => {
    p.setDragged(d);
    p.setDragOver(null);
    try {
      e.dataTransfer.setData("application/wwm-gear-stat", JSON.stringify(d));
      e.dataTransfer.effectAllowed = "move";
    } catch {
      // ignore
    }
  };

  const endDrag = () => {
    p.setDragged(null);
    p.setDragOver(null);
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const computeInsertIndexFromPointer = (
    e: React.DragEvent,
    rowElement: HTMLElement,
    rowIndex: number
  ) => {
    const rect = rowElement.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    return isTopHalf ? rowIndex : rowIndex + 1;
  };

  const dropOnList =
    (targetList: Exclude<DragSource, "addition">, insertIndex?: number) =>
    (e: React.DragEvent) => {
      e.preventDefault();
      const d = p.dragged ?? readDraggedFromDataTransfer(e);
      if (!d) return;

      const item = getDraggedItem(d);
      if (!item) return;

      const targetListItems = targetList === "mains" ? p.mains : p.subs;
      const targetInsertIndex =
        insertIndex ??
        (p.dragOver?.zone === targetList
          ? p.dragOver.insertIndex
          : targetListItems.length);

      // Same-list reorder adjustment / no-op
      if (
        d.source === targetList &&
        (d.source === "mains" || d.source === "subs")
      ) {
        const sourceList = d.source === "mains" ? p.mains : p.subs;
        const sourceIndex = findRowIndexById(sourceList, d.rowId);
        if (sourceIndex < 0) {
          endDrag();
          return;
        }

        // No-op drops (same position / adjacent)
        if (
          targetInsertIndex === sourceIndex ||
          targetInsertIndex === sourceIndex + 1
        ) {
          endDrag();
          return;
        }

        let adjustedInsertIndex = targetInsertIndex;
        if (adjustedInsertIndex > sourceIndex) adjustedInsertIndex -= 1;
        removeFromSource(d);
        insertIntoList(targetList, item, adjustedInsertIndex);
      } else {
        // Cross-group move (including addition -> list)
        removeFromSource(d);
        insertIntoList(targetList, item, targetInsertIndex);
      }

      endDrag();
    };

  const dropOnAddition = () => (e: React.DragEvent) => {
    e.preventDefault();
    const d = p.dragged ?? readDraggedFromDataTransfer(e);
    if (!d) return;

    const item = getDraggedItem(d);
    if (!item) return;

    // Swap behavior: if addition exists, put it back to the source list (append)
    const prevAddition = p.addition;
    removeFromSource(d);
    p.setAddition(item);

    if (prevAddition && d.source !== "addition") {
      if (d.source === "mains") insertIntoList("mains", prevAddition);
      else if (d.source === "subs") insertIntoList("subs", prevAddition);
    }

    endDrag();
  };

  return {
    dragOver: p.dragOver,
    setDragOver: p.setDragOver,
    startDrag,
    endDrag,
    allowDrop,
    computeInsertIndexFromPointer,
    dropOnList,
    dropOnAddition,
  };
};
