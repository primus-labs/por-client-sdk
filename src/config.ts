import { assertEnvVars } from "./utils.js";
import * as dotenv from "dotenv";
dotenv.config();

export class Config {
  static readonly TOKEN = process.env.TOKEN?.trim() ?? "";
  static readonly PROJECT_ID = process.env.PROJECT_ID?.trim() ?? "";
  static readonly PROGRAM_ID = process.env.PROGRAM_ID?.trim() ?? "";

  static readonly LOG_VERBOSE = Number(process.env.LOG_VERBOSE ?? 0);
  static readonly ZKVM_SERVICE_URL = process.env.ZKVM_SERVICE_URL?.trim() ?? "https://api-por.primuslabs.xyz:38080";
  static readonly DATA_SERVICE_URL = process.env.DATA_SERVICE_URL?.trim() ?? "http://api-dev.padolabs.org:38101";

  static readonly RPC_URL = process.env.RPC_URL?.trim() ?? "https://mainnet.base.org";
  static readonly PRIVATE_KEY = process.env.PRIVATE_KEY?.trim() ?? "";

  static readonly ZKTLS_MODE = process.env.ZKTLS_MODE?.trim() ?? "POR";

  static validate() {
    if (this.ZKTLS_MODE === "POR") {
      assertEnvVars(this, ["TOKEN", "PROJECT_ID"] as const);
    }
  }
}

