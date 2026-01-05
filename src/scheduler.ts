import { sleepMs } from "./utils.js";

type JobFn = () => Promise<void>;

interface SchedulerOptions {
  intervalMs: number; // ms
  shouldStop?: (err: any) => boolean;
  stopMode?: "immediate" | "delayed"; // default: delayed
}

export class Scheduler {
  private stopped = false;

  constructor(
    private job: JobFn,
    private opts: SchedulerOptions
  ) {
    if (!this.opts.stopMode) this.opts.stopMode = "delayed";

    process.on("SIGTERM", () => this.stop("SIGTERM"));
    process.on("SIGINT", () => this.stop("SIGINT"));
  }

  stop(signal?: string) {
    if (signal) {
      console.log(`🛑 Scheduler stop requested by ${signal}`);
    } else {
      console.log("🛑 Scheduler stop requested");
    }
    this.stopped = true;
  }

  async start() {
    const intervalMs = this.opts.intervalMs;

    while (!this.stopped) {
      const startedAt = Date.now();

      let shouldStop = false;
      try {
        await this.job();
      } catch (err: any) {
        shouldStop = this.opts.shouldStop?.(err) ?? false;
      }

      const elapsedMs = Date.now() - startedAt;
      const delayMs = Math.max(0, intervalMs - elapsedMs);

      if (shouldStop && this.opts.stopMode === "immediate") {
        console.log("🔁 stop immediately due to error");
        this.stopped = true;
      }

      if (!this.stopped) {
        console.log(`⏳ Next in ${delayMs} ms ...`);
        await sleepMs(delayMs);
      }

      if (shouldStop && this.opts.stopMode === "delayed") {
        console.log("🔁 delayed stop triggered after interval");
        this.stopped = true;
      }
    }

    console.log("👋 Scheduler exited");
  }
}
