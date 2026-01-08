import { sleepMs } from "./utils.js";

type JobFn = () => Promise<void>;

interface SchedulerOptions {
  intervalMs: number; // ms
  shouldStop?: (err: any) => boolean;
  stopMode?: "immediate" | "delayed"; // default: delayed
}

export class Scheduler {
  private stopped = false;
  private lastSigintTime = 0;
  private sigintCount = 0;

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
      if (signal !== "SIGINT") {
        console.log(`🛑 Received ${signal}.`);
      }
    } else {
      console.log("🛑 Stop requested.");
    }

    const now = Date.now();
    if (signal === "SIGINT") {
      if (now - this.lastSigintTime <= 2000) { this.sigintCount++; }
      else { this.sigintCount = 1; }
      this.lastSigintTime = now;
      if (this.sigintCount >= 2) { process.exit(1); }
      else { console.log(`🛑 Received ${signal}. (Press twice Ctrl + C to exit)`); }
    }

    this.stopped = true;
  }

  async start() {
    const intervalMs = this.opts.intervalMs;
    console.log(`Start Scheduler at ${new Date().toISOString()} with job interval: ${intervalMs} (ms)`);

    while (!this.stopped) {
      const startedAt = Date.now();

      console.log("🚀 job start", new Date().toISOString());
      let shouldStop = false;
      try {
        await this.job();
      } catch (err: any) {
        shouldStop = this.opts.shouldStop?.(err) ?? false;
      }
      console.log("✅ job done", new Date().toISOString());

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
