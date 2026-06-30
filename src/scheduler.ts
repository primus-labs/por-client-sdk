import { sleepMs } from "./utils.js";
import fs from "fs";
import path from "path";
import paths from "./paths.js";

interface SchedulerState {
  lastStartedAt: number;
}

function readState(file: string): SchedulerState | null {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeState(file: string, state: SchedulerState) {
  try {
    const dir = path.dirname(path.resolve(file));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state), "utf8");
  } catch (err) {
    console.warn("⚠️ Failed to write scheduler state:", err);
  }
}


type JobFn = (scheduler: Scheduler) => Promise<void>;

interface SchedulerOptions {
  intervalMs: number; // ms
  shouldStop?: (err: any) => boolean;
  stopMode?: "immediate" | "delayed"; // default: delayed
  stateFile?: string;
}

export class Scheduler {
  private stopped = false;
  private lastSigintTime = 0;
  private sigintCount = 0;
  private intervalMs: number; // ms
  private stateFile?: string;

  constructor(
    private jobFn: JobFn,
    private opts: SchedulerOptions
  ) {
    if (!this.opts.stopMode) this.opts.stopMode = "delayed";
    this.stateFile = opts.stateFile ?? paths.stateFilePath;
    this.intervalMs = opts.intervalMs;

    process.on("SIGTERM", () => this.stop("SIGTERM"));
    process.on("SIGINT", () => this.stop("SIGINT"));
  }

  updateInterval(newInterval: number) {
    if (newInterval !== this.intervalMs) {
      this.intervalMs = newInterval;
      console.log(`Interval updated to ${this.intervalMs} ms`);
    }
  }

  stop(signal?: string) {
    if (signal && signal !== "SIGINT") {
      console.log(`🛑 Received ${signal}.`);
    }

    const now = Date.now();
    if (signal === "SIGINT") {
      if (now - this.lastSigintTime <= 2000) this.sigintCount++;
      else this.sigintCount = 1;
      this.lastSigintTime = now;

      if (this.sigintCount >= 2) process.exit(1);
      console.log("🛑 Press Ctrl+C twice to exit");
    }

    this.stopped = true;
  }

  async start() {
    console.log(`Start Scheduler at ${new Date().toISOString()} with job interval: ${this.intervalMs} ms`);

    if (this.stateFile) {
      const state = readState(this.stateFile);
      if (state?.lastStartedAt) {
        const elapsed = Date.now() - state.lastStartedAt;
        const delay = this.intervalMs - elapsed;

        if (delay > 0) {
          console.log(`⏳ Recovering schedule, wait the next in ${delay / 1000.0} s`);
          await sleepMs(delay);
        }
      }
    }
    while (!this.stopped) {
      const startedAt = Date.now();

      if (this.stateFile) {
        writeState(this.stateFile, { lastStartedAt: startedAt });
      }

      console.log("🚀 job start", new Date(startedAt).toISOString());

      let shouldStop = false;
      try {
        await this.jobFn(this);
      } catch (err: any) {
        shouldStop = this.opts.shouldStop?.(err) ?? false;
      }
      console.log("✅ job done", new Date().toISOString());

      const elapsedMs = Date.now() - startedAt;
      const delayMs = Math.max(0, this.intervalMs - elapsedMs);

      if (shouldStop && this.opts.stopMode === "immediate") {
        console.log("🔁 stop immediately due to error");
        this.stopped = true;
      }

      if (!this.stopped) {
        console.log(`⏳ Next in ${delayMs / 1000.0} s`);
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
