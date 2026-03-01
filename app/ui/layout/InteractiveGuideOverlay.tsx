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
        title: "Bước 1: Chọn Level",
        description: "Chọn Player level phù hợp trước khi tối ưu damage.",
        listenEvents: ["change", "click"],
    },
    {
        selector: "[data-tour='martial-art']",
        title: "Bước 2: Chọn Martial Art",
        description: "Chọn Martial Art để đồng bộ element chính.",
        listenEvents: ["change", "click"],
    },
    {
        selector: "[data-tour='tab-rotation']",
        title: "Bước 3: Mở Rotation",
        description: "Nhấn tab Rotation để thiết lập chuỗi kỹ năng.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='tab-import']",
        title: "Bước 4: Mở Import / Export",
        description: "Nhấn tab Import / Export để sang bước import gear.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='import-gear-button']",
        title: "Bước 5: Import Gear",
        description: "Nhấn Import from Clipboard để nạp gear đã copy.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='tab-stats']",
        title: "Bước 6: Quay lại Stats",
        description: "Nhấn tab Stats để nhập stat sau khi import gear.",
        listenEvents: ["click"],
    },
    {
        selector: "[data-tour='stat-input']",
        title: "Bước 7: Nhập Stat",
        description: "Nhập chỉ số vào ô Total để hoàn tất quy trình.",
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
                Hướng dẫn thao tác
            </button>
        );
    }

    const padding = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const highlightStyle = rect
        ? {
            top: Math.max(0, rect.top - padding),
            left: Math.max(0, rect.left - padding),
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
        }
        : null;

    const baseTooltipTop = rect ? rect.bottom + 12 : 24;
    const fallbackTop = rect ? Math.max(16, rect.top - tooltipHeight - 12) : 24;
    const tooltipTop =
        baseTooltipTop + tooltipHeight + 16 <= viewportH ? baseTooltipTop : fallbackTop;
    const tooltipLeft = rect
        ? Math.min(Math.max(16, rect.left), Math.max(16, viewportW - 360))
        : 16;

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
                className="fixed z-[102] w-[min(340px,calc(100vw-32px))] rounded-xl border border-white/15 bg-background/95 p-4 shadow-2xl backdrop-blur"
                style={{ top: tooltipTop, left: tooltipLeft }}
            >
                <div className="mb-1 text-xs text-muted-foreground">
                    {stepIndex + 1}/{STEPS.length}
                </div>
                <div className="text-sm font-semibold">{currentStep.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{currentStep.description}</p>

                {!rect && (
                    <p className="mt-2 text-[11px] text-amber-300">
                        Chưa thấy mục tiêu trên màn hình, hãy chuyển đúng tab để tiếp tục.
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
                        Bỏ qua
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
                        {stepIndex >= STEPS.length - 1 ? "Hoàn tất" : "Tiếp"}
                    </button>
                </div>
            </div>
        </>
    );
}