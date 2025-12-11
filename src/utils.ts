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
