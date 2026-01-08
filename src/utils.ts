import fs from "fs";

/**
 * Save data to file
 */
export function saveToFile(filepath: string, data: string | Buffer): void {
  fs.writeFileSync(filepath, data);
}

/**
 * Sleep helper (ms)
 */
export async function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertEnvVars<T extends Record<string, any>>(obj: T, keys: readonly (keyof T)[]) {
  for (const key of keys) {
    if (!obj[key]) {
      throw new Error(`❌ Missing required .env value: ${String(key)}`);
    }
  }
}

export function makeErrData(err: any) {
  if (!err) return undefined;

  const errData: Record<string, any> = {};
  if (err.code) errData.code = err.code;
  if (err.message) errData.message = err.message;
  if (err.data) errData.data = err.data;
  return errData;
}
