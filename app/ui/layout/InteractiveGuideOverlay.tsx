"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Step = {
    selector: string;
    title: string;
    description: string;
    listenEvents: Array<"click" | "change" | "input">;
};

const TOUR_DONE_KEY = "wwm_interactive_guide_done";

const STEPS: Step[] = [
    {
        selector: "[data-tour='player-level']",
        title: "Step 1: Choose Level",
        description: "Select your Player level before optimizing damage.",
        listenEvents: ["change", "click"],
    },
    {
        selector: "[data-tour='martial-art']",
        title: "Step 2: Choose Martial Art",
        description: "Pick your Martial Art to sync the main element.",
        listenEvents: ["change", "click"],
    },
    {
        selector: "[data-tour='tab-rotation']",
        title: "Step 3: Open Rotation",
        description: "Click the Rotation tab to set up your skill sequence.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='tab-gear-root']",
        title: "Step 4: Open Gear",
        description: "Click the Gear root tab to manage gear.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='gear-add-open']",
        title: "Step 5: Open Add Gear",
        description: "Click + Add Gear to open the gear form.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='gear-ocr']",
        title: "Step 6: Use OCR",
        description: "Click OCR and pick a gear image to auto-fill fields.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='gear-add-submit']",
        title: "Step 7: Add Gear",
        description: "Click Add Gear to save the item.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='tab-main-root']",
        title: "Step 8: Open Main",
        description: "Click the Main root tab to return to the main calculator.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='tab-stats']",
        title: "Step 9: Back to Stats",
        description: "Click the Stats tab to continue with stat inputs.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='stat-input']",
        title: "Step 10: Enter Stat",
        description: "Enter values in a Total field to complete the flow.",
        listenEvents: ["input", "change", "click"],
    },
];

export function InteractiveGuideOverlay() {
    const [isActive, setIsActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const [tooltipHeight, setTooltipHeight] = useState(170);

    const currentStep = STEPS[stepIndex];

    const currentElement = useMemo(() => {
        if (!isActive || !currentStep) return null;
        return document.querySelector(currentStep.selector) as HTMLElement | null;
    }, [isActive, currentStep]);

    useEffect(() => {
        const alreadyDone = localStorage.getItem(TOUR_DONE_KEY) === "1";
        if (!alreadyDone) {
            setIsActive(true);
            setStepIndex(0);
        }
    }, []);

    useEffect(() => {
        if (!isActive) return;

        const updateRect = () => {
            if (!currentElement) {
                setRect(null);
                return;
            }
            setRect(currentElement.getBoundingClientRect());
        };

        updateRect();

        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);

        const observer = new MutationObserver(updateRect);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        return () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect, true);
            observer.disconnect();
        };
    }, [isActive, currentElement]);

    useEffect(() => {
        if (!isActive || !currentElement || !currentStep) return;

        const advance = () => {
            setStepIndex((prev) => {
                if (prev >= STEPS.length - 1) {
                    localStorage.setItem(TOUR_DONE_KEY, "1");
                    setIsActive(false);
                    return prev;
                }
                return prev + 1;
            });
        };

        const onEvent = () => {
            window.setTimeout(advance, 150);
        };

        currentStep.listenEvents.forEach((eventName) => {
            currentElement.addEventListener(eventName, onEvent);
        });

        return () => {
            currentStep.listenEvents.forEach((eventName) => {
                currentElement.removeEventListener(eventName, onEvent);
            });
        };
    }, [isActive, currentElement, currentStep]);

    useEffect(() => {
        if (!tooltipRef.current) return;
        setTooltipHeight(tooltipRef.current.getBoundingClientRect().height || 170);
    }, [stepIndex, isActive, rect]);

    if (!isActive || !currentStep) {
        return (
            <button
                type="button"
                onClick={() => {
                    setStepIndex(0);
                    setIsActive(true);
                }}
                className="fixed bottom-6 right-6 z-[110] rounded-full border border-emerald-500/30 bg-background/90 px-4 py-2 text-xs text-emerald-300 shadow-lg backdrop-blur"
            >
                Start Guide
            </button>
        );
    }

    const padding = 8;
    const viewportPadding = 16;
    const gap = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const tooltipWidth = Math.min(340, Math.max(220, viewportW - viewportPadding * 2));

    const highlightStyle = rect
        ? {
            top: Math.max(0, rect.top - padding),
            left: Math.max(0, rect.left - padding),
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
        }
        : null;

    const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

    const bounds = rect
        ? {
            left: Math.max(0, rect.left - padding),
            right: Math.min(viewportW, rect.right + padding),
            top: Math.max(0, rect.top - padding),
            bottom: Math.min(viewportH, rect.bottom + padding),
        }
        : null;

    const defaultTop = rect ? rect.bottom + gap : viewportPadding;
    const defaultLeft = rect ? rect.left : viewportPadding;

    let tooltipTop = clamp(
        defaultTop,
        viewportPadding,
        Math.max(viewportPadding, viewportH - tooltipHeight - viewportPadding)
    );
    let tooltipLeft = clamp(
        defaultLeft,
        viewportPadding,
        Math.max(viewportPadding, viewportW - tooltipWidth - viewportPadding)
    );

    if (bounds) {
        const overlaps = (left: number, top: number) => {
            const right = left + tooltipWidth;
            const bottom = top + tooltipHeight;
            return !(
                right <= bounds.left ||
                left >= bounds.right ||
                bottom <= bounds.top ||
                top >= bounds.bottom
            );
        };

        const candidates = [
            {
                top: clamp(
                    bounds.top - tooltipHeight - gap,
                    viewportPadding,
                    Math.max(viewportPadding, viewportH - tooltipHeight - viewportPadding)
                ),
                left: clamp(
                    bounds.left,
                    viewportPadding,
                    Math.max(viewportPadding, viewportW - tooltipWidth - viewportPadding)
                ),
            },
            {
                top: clamp(
                    bounds.bottom + gap,
                    viewportPadding,
                    Math.max(viewportPadding, viewportH - tooltipHeight - viewportPadding)
                ),
                left: clamp(
                    bounds.left,
                    viewportPadding,
                    Math.max(viewportPadding, viewportW - tooltipWidth - viewportPadding)
                ),
            },
            {
                top: clamp(
                    bounds.top,
                    viewportPadding,
                    Math.max(viewportPadding, viewportH - tooltipHeight - viewportPadding)
                ),
                left: clamp(
                    bounds.right + gap,
                    viewportPadding,
                    Math.max(viewportPadding, viewportW - tooltipWidth - viewportPadding)
                ),
            },
            {
                top: clamp(
                    bounds.top,
                    viewportPadding,
                    Math.max(viewportPadding, viewportH - tooltipHeight - viewportPadding)
                ),
                left: clamp(
                    bounds.left - tooltipWidth - gap,
                    viewportPadding,
                    Math.max(viewportPadding, viewportW - tooltipWidth - viewportPadding)
                ),
            },
        ];

        const best = candidates.find((candidate) => !overlaps(candidate.left, candidate.top));

        if (best) {
            tooltipTop = best.top;
            tooltipLeft = best.left;
        }
    }

    return (
        <>
            <div className="pointer-events-none fixed inset-0 z-[100] bg-black/55" />

            {highlightStyle && (
                <div
                    className="pointer-events-none fixed z-[101] rounded-lg border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                    style={highlightStyle}
                />
            )}

            <div
                ref={tooltipRef}
                className="fixed z-[102] rounded-xl border border-white/15 bg-background/95 p-4 shadow-2xl backdrop-blur"
                style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
            >
                <div className="mb-1 text-xs text-muted-foreground">
                    {stepIndex + 1}/{STEPS.length}
                </div>
                <div className="text-sm font-semibold">{currentStep.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{currentStep.description}</p>

                {!rect && (
                    <p className="mt-2 text-[11px] text-amber-300">
                        Target is not visible yet. Switch to the required tab and continue.
                    </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            localStorage.setItem(TOUR_DONE_KEY, "1");
                            setIsActive(false);
                        }}
                        className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                        Skip
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (stepIndex >= STEPS.length - 1) {
                                localStorage.setItem(TOUR_DONE_KEY, "1");
                                setIsActive(false);
                                return;
                            }
                            setStepIndex((prev) => prev + 1);
                        }}
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20"
                    >
                        {stepIndex >= STEPS.length - 1 ? "Finish" : "Next"}
                    </button>
                </div>
            </div>
        </>
    );
}