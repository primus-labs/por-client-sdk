import axios, { AxiosInstance } from "axios";
import { ClientError } from "../error.js";

export interface ApiResponse<T> {
  rc: 0 | 1;
  mc: string;
  msg: string;
  result: T;
}

export interface SubmitTaskResult {
  taskId: string;
  taskTxHash: string;
  taskAttestors: string[];
  submitterAddress: string,
}

export interface CheckPaymentResult {
  projectId: string;
  subscriptionType: string;
}

export class DataServiceClient {
  private readonly client: AxiosInstance;
  constructor(baseURL: string, timeout: number = 30_000) {
    this.client = axios.create({ baseURL, timeout });
  }

  async submitTask(
    bizId: string,
    projectId: string,
    token: string,
  ): Promise<SubmitTaskResult> {
    const res = await this.client.get<ApiResponse<SubmitTaskResult>>(
      "/public/program/submitTask",
      {
        params: { bizId, projectId },
        headers: {
          "POR-TOKEN": token,
        },
      }
    );

    const raw = this.unwrap('submitTask', res.data);
    return {
      taskId: raw.taskId,
      taskTxHash: raw.taskTxHash,
      taskAttestors: raw.taskAttestors,
      submitterAddress: raw.submitterAddress,
    };
  }

  async checkPayment(
    bizId: string,
    projectId: string,
    token: string,
  ): Promise<CheckPaymentResult> {
    const res = await this.client.get<ApiResponse<CheckPaymentResult>>(
      "/public/program/payment/check",
      {
        params: { bizId, projectId },
        headers: {
          "POR-TOKEN": token,
        },
      }
    );

    const raw = this.unwrap('checkPayment', res.data);
    return {
      projectId: raw.projectId,
      subscriptionType: raw.subscriptionType,
    };
  }


  private unwrap<T>(op: string, data: ApiResponse<T>): T {
    if (data.rc === 0) {
      return data.result;
    }

    // data.rc === 1
    const { mc, msg } = data;
    throw new ClientError("72001", `${op} failed`, { op, mc, msg });
  }
}

