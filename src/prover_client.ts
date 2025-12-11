import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const DVC_SERVICE_URL = "http://localhost:38080"; // todo,default

export class ProverClient {
  private client: AxiosInstance;

  constructor(timeout = 10000) {
    const baseURL = process.env.DVC_SERVICE_URL?.trim() || DVC_SERVICE_URL;
    this.client = axios.create({ baseURL, timeout });
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

  async submitTask(programId: string, attestationData: any): Promise<any> {
    const form = new FormData();
    form.append("program_id", programId);
    form.append("attestation_data", attestationData);

    const res = await this.client.post("/submitTask", form, {
      headers: form.getHeaders()
    });
    return res.data;
  }

  async getResult(taskId: string): Promise<any> {
    const res = await this.client.get("/getResult", {
      params: { task_id: taskId }
    });
    return res.data;
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
