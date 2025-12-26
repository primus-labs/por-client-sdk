import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import fs from "fs";
import { SdkConfig, resolveSdkConfig } from "../config.js";
import { ClientError } from "../error.js";
import { sleepMs, mockErrorReport, makeErrData } from "../utils.js";

export class ProverClient {
  private readonly config: Required<SdkConfig>;
  private client: AxiosInstance;

  constructor(config: SdkConfig = {}, timeout = 30_000) {
    this.config = resolveSdkConfig(config);
    this.client = axios.create({ baseURL: this.config.zkvmServiceUrl, timeout });
  }

  async uploadProgram(
    filePath: string,
    name: string,
    version: string,
    desc: string,
    prover = "succinct"
  ): Promise<any> {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("prover", prover);
    form.append("name", name);
    form.append("version", version);
    form.append("desc", desc);

    const res = await this.client.post("/uploadProgram", form, {
      headers: form.getHeaders()
    });

    return this.unwrap("uploadProgram", res.data);
  }

  async submitTask(attestationData: string): Promise<any> {
    const form = new FormData();
    form.append("zktls_mode", this.config.zktlsMode);
    form.append("token", this.config.token);
    form.append("project_id", this.config.projectId);
    form.append("program_id", this.config.programId);
    form.append("attestation_data", attestationData);

    const res = await this.client.post("/submitTask", form, {
      headers: form.getHeaders()
    });

    return this.unwrap("submitTask", res.data);
  }

  async getResult(taskId: string): Promise<any> {
    const res = await this.client.get("/getResult", {
      params: { task_id: taskId }
    });
    return this.unwrap("getResult", res.data);
  }

  private unwrap(op: string, data: any): any {
    if (data.rc === 0) {
      return data.result;
    }

    // data.rc === 1
    const { mc, msg } = data;
    throw new ClientError("73001", `${op} failed`, { op, mc, msg });
  }


  async submitTaskWithRetry(attestationData: string, maxRetries = 4, baseDelay = 1000): Promise<any> {
    let attempt = 0;
    const start = Date.now();
    console.log("Submitting task...");

    while (true) {
      try {
        const result = await this.submitTask(attestationData);
        console.log(`Submitting task done (${Date.now() - start}ms):`, result);
        return result;
      } catch (err: any) {
        const NO_RETRY_CODES = ["73001"]; // from zkvm
        if (err instanceof ClientError && NO_RETRY_CODES.includes(err.code)) throw err;

        attempt++;
        if (attempt > maxRetries) {
          throw new ClientError("73002", `Submitting task failed after ${maxRetries} retries`, makeErrData(err));
        }

        const delay = baseDelay * 2 ** (attempt - 1);
        console.warn(`Submitting task retrying in ${delay}ms...`);
        await sleepMs(delay);
      }
    }
  }

  async getResultWithTimeout(taskId: string, timeoutMs: number = 600_000, intervalMs: number = 5000): Promise<any> {
    const start = Date.now();

    const isPending = (status?: string) =>
      status === undefined || status === "queued" || status === "running";

    let errData: any = undefined;
    while (true) {
      const elapsed = Date.now() - start;
      if (elapsed > timeoutMs) {
        throw new ClientError("73003", `Timeout: cannot get task[${taskId}] complete result within ${timeoutMs}ms`, errData);
      }

      try {
        const data = await this.getResult(taskId);
        const { status } = data ?? {};
        errData = { taskId, status };
        if (!isPending(status)) {
          return data;
        }
      } catch (err: any) {
        const NO_RETRY_CODES = ["73001"]; // from zkvm
        if (err instanceof ClientError && NO_RETRY_CODES.includes(err.code)) throw err;
        errData = makeErrData(err);
      }

      console.warn(`Getting result in ${intervalMs}ms...`);
      await sleepMs(intervalMs);
    }
  }

  private async _doZkVM(attestationData: string): Promise<any> {
    try {
      const submitResult = await this.submitTaskWithRetry(attestationData);
      const result = await this.getResultWithTimeout(submitResult.task_id);
      return result;
    } catch (err: any) {
      if (!(err instanceof ClientError)) {
        err = new ClientError("73099", `Do doZkVM failed`, makeErrData(err));
      }
      await mockErrorReport(err);

      throw err;
    }
  }

  async doZkVM(attestationData: string): Promise<any> {
    return await this._doZkVM(attestationData);
  }
}
