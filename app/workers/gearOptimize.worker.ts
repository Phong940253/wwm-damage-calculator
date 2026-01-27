import type {
  CustomGear,
  ElementStats,
  GearSlot,
  InputStats,
  Rotation,
} from "@/app/types";
import {
  computeOptimizeResultsAsync,
  OptimizeCancelledError,
  type OptimizeComputation,
} from "@/app/domain/gear/gearOptimize";

type OptimizeWorkerOptions = {
  candidateGears?: CustomGear[];
  slotsToOptimize?: GearSlot[];
  lockedSlots?: Partial<Record<GearSlot, string | null>>;
  restrictSlots?: Partial<Record<GearSlot, Array<string | null>>>;
  yieldToEventLoop?: boolean;
  autoReduceIfOverCombos?: number;
  reduceTargetCombos?: number;
  reducePerSlotCap?: number;
};

type StartMessage = {
  type: "start";
  jobId: string;
  payload: {
    stats: InputStats;
    elementStats: ElementStats;
    customGears: CustomGear[];
    equipped: Partial<Record<GearSlot, string | undefined>>;
    desiredDisplay: number;
    rotation?: Rotation;
    options?: OptimizeWorkerOptions;
  };
};

type CancelMessage = {
  type: "cancel";
  jobId: string;
};

type InMessage = StartMessage | CancelMessage;

type ProgressMessage = {
  type: "progress";
  jobId: string;
  current: number;
  total: number;
};

type DoneMessage = {
  type: "done";
  jobId: string;
  result: OptimizeComputation;
};

type ErrorMessage = {
  type: "error";
  jobId: string;
  error: { name?: string; message: string };
};

type CancelledMessage = {
  type: "cancelled";
  jobId: string;
};

const controllers = new Map<string, AbortController>();

function post(
  msg: ProgressMessage | DoneMessage | ErrorMessage | CancelledMessage,
) {
  (self as unknown as { postMessage: (m: unknown) => void }).postMessage(msg);
}

self.addEventListener("message", async (event: MessageEvent) => {
  const msg = event.data as InMessage;

  if (!msg || typeof msg !== "object" || !("type" in msg)) return;

  if (msg.type === "cancel") {
    controllers.get(msg.jobId)?.abort();
    return;
  }

  if (msg.type !== "start") return;

  const { jobId, payload } = msg;

  // If a job with this id somehow exists, cancel it first.
  controllers.get(jobId)?.abort();

  const controller = new AbortController();
  controllers.set(jobId, controller);

  try {
    const result = await computeOptimizeResultsAsync(
      payload.stats,
      payload.elementStats,
      payload.customGears,
      payload.equipped,
      payload.desiredDisplay,
      payload.rotation,
      payload.options,
      (current, total) => post({ type: "progress", jobId, current, total }),
      controller.signal,
    );

    post({ type: "done", jobId, result });
  } catch (e) {
    if (e instanceof OptimizeCancelledError) {
      post({ type: "cancelled", jobId });
      return;
    }

    post({
      type: "error",
      jobId,
      error: {
        name: e instanceof Error ? e.name : undefined,
        message: e instanceof Error ? e.message : "Optimize failed",
      },
    });
  } finally {
    controllers.delete(jobId);
  }
});
