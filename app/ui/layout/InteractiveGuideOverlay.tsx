"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Step = {
    selector: string;
    title: string;
    description: string;
    listenEvents: Array<"click" | "change" | "input">;
    advanceDelayMs?: number;
    waitForSelector?: string;
    waitForSelectorCycle?: string;
    waitTimeoutMs?: number;
};

type GuideId = "setup" | "optimize";

type GuideDefinition = {
    id: GuideId;
    doneKey: string;
    startLabel: string;
    steps: Step[];
};

const SETUP_STEPS: Step[] = [
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

const OPTIMIZE_STEPS: Step[] = [
    {
        selector: "[data-tour='tab-gear-root']",
        title: "Step 1: Open Gear",
        description: "Click the Gear root tab.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='gear-optimize-open']",
        title: "Step 2: Open Optimize",
        description: "Click Optimize to open the optimizer dialog.",
        listenEvents: ["click"],
        advanceDelayMs: 250,
        waitForSelector: "[data-tour='gear-optimize-recalculate']",
        waitTimeoutMs: 120000,
    },
    {
        selector: "[data-tour='gear-optimize-recalculate']",
        title: "Step 3: Recalculate",
        description: "Adjust limits if needed, then click Recalculate.",
        listenEvents: ["click"],
        advanceDelayMs: 300,
        waitForSelectorCycle: "[data-tour='gear-optimize-progress']",
        waitTimeoutMs: 120000,
    },
    {
        selector: "[data-tour='gear-optimize-equip']",
        title: "Step 4: Equip Result",
        description: "Click Equip on the result you want to apply.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='tab-main-root']",
        title: "Step 5: Back to Main",
        description: "Click the Main root tab to return.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='tab-stats']",
        title: "Step 6: Open Stats",
        description: "Click Stats to review updated values.",
        listenEvents: ["click"],
    },
];

const GUIDES: Record<GuideId, GuideDefinition> = {
    setup: {
        id: "setup",
        doneKey: "wwm_interactive_guide_done",
        startLabel: "Start Setup Guide",
        steps: SETUP_STEPS,
    },
    optimize: {
        id: "optimize",
        doneKey: "wwm_interactive_optimize_guide_done",
        startLabel: "Start Optimize Guide",
        steps: OPTIMIZE_STEPS,
    },
};

const FEEDBACK_URL = "https://github.com/Phong940253/wwm-damage-calculator/issues/new";

export function InteractiveGuideOverlay() {
    const [activeGuideId, setActiveGuideId] = useState<GuideId | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [mobileLauncherOpen, setMobileLauncherOpen] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const isAdvancingRef = useRef(false);
    const [tooltipHeight, setTooltipHeight] = useState(170);

    const activeGuide = activeGuideId ? GUIDES[activeGuideId] : null;
    const currentSteps = activeGuide?.steps ?? [];
    const currentStep = currentSteps[stepIndex];

    const currentElement = useMemo(() => {
        if (!isActive || !currentStep) return null;
        return document.querySelector(currentStep.selector) as HTMLElement | null;
    }, [isActive, currentStep]);

    useEffect(() => {
        const alreadyDone = localStorage.getItem(GUIDES.setup.doneKey) === "1";
        if (!alreadyDone) {
            setActiveGuideId("setup");
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

        isAdvancingRef.current = false;

        const waitForSelectorCycle = async (selector: string, timeoutMs: number) => {
            const start = Date.now();
            let seen = false;

            while (Date.now() - start < timeoutMs) {
                const found = Boolean(document.querySelector(selector));

                if (found) {
                    seen = true;
                } else if (seen) {
                    return;
                }

                await new Promise((resolve) => window.setTimeout(resolve, 120));
            }
        };

        const waitForSelector = async (selector: string, timeoutMs: number) => {
            const start = Date.now();

            while (Date.now() - start < timeoutMs) {
                if (document.querySelector(selector)) {
                    return;
                }
                await new Promise((resolve) => window.setTimeout(resolve, 120));
            }
        };

        const advance = () => {
            setStepIndex((prev) => {
                if (prev >= currentSteps.length - 1) {
                    if (activeGuide) {
                        localStorage.setItem(activeGuide.doneKey, "1");
                    }
                    setIsActive(false);
                    return prev;
                }
                return prev + 1;
            });
        };

        let canceled = false;

        const onEvent = async () => {
            if (isAdvancingRef.current) return;
            isAdvancingRef.current = true;

            const delay = currentStep.advanceDelayMs ?? 150;
            await new Promise((resolve) => window.setTimeout(resolve, delay));

            if (canceled) return;

            if (currentStep.waitForSelector) {
                await waitForSelector(
                    currentStep.waitForSelector,
                    currentStep.waitTimeoutMs ?? 15000
                );
            }

            if (canceled) return;

            if (currentStep.waitForSelectorCycle) {
                await waitForSelectorCycle(
                    currentStep.waitForSelectorCycle,
                    currentStep.waitTimeoutMs ?? 15000
                );
            }

            if (canceled) return;

            advance();
            isAdvancingRef.current = false;
        };

        currentStep.listenEvents.forEach((eventName) => {
            currentElement.addEventListener(eventName, onEvent);
        });

        return () => {
            canceled = true;
            isAdvancingRef.current = false;
            currentStep.listenEvents.forEach((eventName) => {
                currentElement.removeEventListener(eventName, onEvent);
            });
        };
    }, [isActive, currentElement, currentStep, activeGuide, currentSteps.length]);

    useEffect(() => {
        if (!tooltipRef.current) return;
        setTooltipHeight(tooltipRef.current.getBoundingClientRect().height || 170);
    }, [stepIndex, isActive, rect]);

    if (!isActive || !currentStep || !activeGuide) {
        return (
            <div className="fixed bottom-4 right-4 z-[110] sm:bottom-6 sm:right-6">
                <div className="hidden flex-col gap-2 sm:flex">
                    <a
                        href={FEEDBACK_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/15 bg-background/90 px-4 py-2 text-xs text-foreground shadow-lg backdrop-blur hover:bg-background"
                    >
                        Send Feedback
                    </a>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveGuideId("setup");
                            setStepIndex(0);
                            setIsActive(true);
                        }}
                        className="rounded-full border border-emerald-500/30 bg-background/90 px-4 py-2 text-xs text-emerald-300 shadow-lg backdrop-blur"
                    >
                        {GUIDES.setup.startLabel}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveGuideId("optimize");
                            setStepIndex(0);
                            setIsActive(true);
                        }}
                        className="rounded-full border border-blue-500/30 bg-background/90 px-4 py-2 text-xs text-blue-300 shadow-lg backdrop-blur"
                    >
                        {GUIDES.optimize.startLabel}
                    </button>
                </div>

                <div className="flex flex-col items-end gap-2 sm:hidden">
                    {mobileLauncherOpen && (
                        <div className="flex flex-col items-end gap-2">
                            <a
                                href={FEEDBACK_URL}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setMobileLauncherOpen(false)}
                                className="rounded-full border border-white/15 bg-background/90 px-3 py-1.5 text-[11px] text-foreground shadow-lg backdrop-blur"
                            >
                                Feedback
                            </a>

                            <button
                                type="button"
                                onClick={() => {
                                    setActiveGuideId("setup");
                                    setStepIndex(0);
                                    setIsActive(true);
                                    setMobileLauncherOpen(false);
                                }}
                                className="rounded-full border border-emerald-500/30 bg-background/90 px-3 py-1.5 text-[11px] text-emerald-300 shadow-lg backdrop-blur"
                            >
                                Setup Guide
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setActiveGuideId("optimize");
                                    setStepIndex(0);
                                    setIsActive(true);
                                    setMobileLauncherOpen(false);
                                }}
                                className="rounded-full border border-blue-500/30 bg-background/90 px-3 py-1.5 text-[11px] text-blue-300 shadow-lg backdrop-blur"
                            >
                                Optimize Guide
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setMobileLauncherOpen((prev) => !prev)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-background/90 text-xs font-semibold text-foreground shadow-lg backdrop-blur"
                        aria-label="Open help actions"
                        aria-expanded={mobileLauncherOpen}
                    >
                        {mobileLauncherOpen ? "×" : "?"}
                    </button>
                </div>
            </div>
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
                    {stepIndex + 1}/{currentSteps.length}
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
                            localStorage.setItem(activeGuide.doneKey, "1");
                            setIsActive(false);
                        }}
                        className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                        Skip
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (stepIndex >= currentSteps.length - 1) {
                                localStorage.setItem(activeGuide.doneKey, "1");
                                setIsActive(false);
                                return;
                            }
                            setStepIndex((prev) => prev + 1);
                        }}
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20"
                    >
                        {stepIndex >= currentSteps.length - 1 ? "Finish" : "Next"}
                    </button>
                </div>

                <a
                    href={FEEDBACK_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-white/15 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    Send Feedback
                </a>
            </div>
        </>
    );
}