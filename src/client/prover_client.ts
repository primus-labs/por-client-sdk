import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import fs from "fs";
import { Config } from "../config.js";

export class ProverClient {
  private client: AxiosInstance;
  constructor(timeout = 10000) {
    Config.validate();
    this.client = axios.create({ baseURL: Config.ZKVM_SERVICE_URL, timeout });
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
    return res.data;
  }

  async listPrograms(): Promise<any> {
    const res = await this.client.get("/listPrograms");
    return res.data;
  }

  async submitTask(attestationData: string, programId?: string): Promise<any> {
    programId = programId || Config.PROGRAM_ID;
    if (!programId) {
      throw Error("missing programId");
    }

    const form = new FormData();
    form.append("zktls_mode", Config.ZKTLS_MODE);
    form.append("token", Config.TOKEN);
    form.append("project_id", Config.PROJECT_ID);
    form.append("program_id", programId);
    form.append("attestation_data", attestationData);

    const res = await this.client.post("/submitTask", form, {
      headers: form.getHeaders()
    });
    return res.data;
  }

  async getResult(taskId: string, timeoutMs: number = 60000, intervalMs: number = 5000): Promise<any> {
    const start = Date.now();

    const isPending = (status?: string) =>
      status === "queued" || status === "running";

    while (true) {
      const elapsed = Date.now() - start;
      if (elapsed > timeoutMs) {
        throw new Error(`Timeout: task ${taskId} did not complete within ${timeoutMs}ms`);
      }

      try {
        const res = await this.client.get("/getResult", {
          params: { task_id: taskId }
        });

        const data = res.data;
        if (!isPending(data?.status)) {
          return data;
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          return null;
        }
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }


  async listTasks(status: string | null = null): Promise<any> {
    const res = await this.client.get("/listTasks", {
      params: { status }
    });
    return res.data;
  }

  async deleteTask(taskId: string): Promise<any> {
    const res = await this.client.delete("/deleteTask", {
      data: { task_id: taskId }
    });
    return res.data;
  }

  async pauseTask(taskId: string): Promise<any> {
    const res = await this.client.post("/pauseTask", null, {
      params: { task_id: taskId }
    });
    return res.data;
  }
}
