import type { ElementStats, InputStats, Rotation } from "@/app/types";
import type { ElementKey } from "@/app/constants";
import {
  calculateIdealGearStats,
  IdealGearCancelledError,
  type IdealGearResult,
} from "@/app/domain/gear/idealOptimizer";

type StartMessage = {
  type: "start";
  jobId: string;
  payload: {
    path: ElementKey;
    stats: InputStats;
    elementStats: ElementStats;
    rotation?: Rotation;
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
  result: IdealGearResult;
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

self.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data as InMessage;

  if (!msg || typeof msg !== "object" || !("type" in msg)) return;

  if (msg.type === "cancel") {
    controllers.get(msg.jobId)?.abort();
    return;
  }

  if (msg.type !== "start") return;

  const { jobId, payload } = msg;

  controllers.get(jobId)?.abort();
  const controller = new AbortController();
  controllers.set(jobId, controller);

  try {
    const result = calculateIdealGearStats(
      payload.path,
      payload.rotation,
      payload.stats,
      payload.elementStats,
      {
        onProgress: (current, total) =>
          post({ type: "progress", jobId, current, total }),
        signal: controller.signal,
      },
    );

    post({ type: "done", jobId, result });
  } catch (e) {
    if (e instanceof IdealGearCancelledError) {
      post({ type: "cancelled", jobId });
      return;
    }

    post({
      type: "error",
      jobId,
      error: {
        name: e instanceof Error ? e.name : undefined,
        message: e instanceof Error ? e.message : "Ideal gear failed",
      },
    });
  } finally {
    controllers.delete(jobId);
  }
});
