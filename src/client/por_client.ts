import { saveToFile, makeErrData } from "../utils.js";
import { Options, getDefaultOptions, RequestParamsInput } from "../types.js";
import { ZkTLSClient } from "./zktls_client.js";
import { ProverClient } from "./prover_client.js";
import { AppConfig } from "../config_schema.js";
import { ClientError } from "../error.js";
import { DataServiceClient } from "./data_service_client.js";
import { v4 as uuidv4 } from 'uuid';

let gobalHasStarted = false;

export class PoRClient {
  readonly config: Required<AppConfig>;
  private zktlsClient: ZkTLSClient;
  private proverClient: ProverClient;

  constructor(config: AppConfig) {
    this.config = { ...config };
    this.zktlsClient = new ZkTLSClient({ ...config });
    this.proverClient = new ProverClient(config.services.zkvm);
  }

  async init(options: any = {}) {
    if (gobalHasStarted) return;
    gobalHasStarted = true;

    try {
      // update interval
      const client = new DataServiceClient(this.config.services.data.url);
      const bizId = uuidv4();
      const userToken = this.config.identity.userToken;
      const projectId = this.config.identity.projectId;
      const { offChainJobConfig } = await client.checkPayment(bizId, projectId, userToken);
      const interval = offChainJobConfig?.jobInterval ?? 0;
      if (interval > 0) {
        if (options.scheduler) {
          options.scheduler.updateInterval(interval * 1000);
        }
      }
    } catch (error) {
      console.log('get job interval error');
    }

    try {
      const client = new DataServiceClient(this.config.services.data.url);
      const userToken = this.config.identity.userToken;
      const projectId = this.config.identity.projectId;
      await client.projectConfig(projectId, userToken, { jobInterval: this.config.runtime.jobInterval });
    } catch (error) {
      console.log('projectConfig error', error);
    }
  }

  /**
   * zkTLS + zkVM (optional)
   */
  async run(params: RequestParamsInput, options: Options = {}): Promise<any> {
    try {
      return await this._run(params, options);
    } catch (err: any) {
      if (!(err instanceof ClientError)) {
        err = new ClientError("70099", `PoR failed`, makeErrData(err));
      }

      const NO_REPORT_CODES = ["71008", "71009"];
      if (NO_REPORT_CODES.includes(err.code)) throw err;

      try {
        const client = new DataServiceClient(this.config.services.data.url);
        const bizId = uuidv4();
        const userToken = this.config.identity.userToken;
        const projectId = this.config.identity.projectId;
        const title = err.message;
        const content = JSON.stringify(err);
        await client.alertTrigger(bizId, projectId, userToken, title, content);
      } catch (err: any) {
        console.log("alertTrigger err:", err?.message, JSON.stringify(err));
      }

      throw err;
    }
  }
  async _run(params: RequestParamsInput, options: Options = {}): Promise<any> {
    const opts = getDefaultOptions(options);

    console.log("do zkTLS");
    const attestationData = await this.zktlsClient.doZkTLS(params, opts);
    const hasAny = Object.values(attestationData).some(v => v !== undefined);

    if (opts.saveAtt && hasAny) {
      saveToFile("attestation.json", JSON.stringify(attestationData));
    }

    if (opts.runZkvm && hasAny) {
      console.log("do zkVM");
      const result = await this.proverClient.doZkVM({
        userToken: this.config.identity.userToken,
        projectId: this.config.identity.projectId,
        network: this.config.blockchain.network,
        attestationData: JSON.stringify(attestationData),
      });

      // console.log("result", result);
      return result;
    }

    return attestationData;
  }

  async tryWithdrawBalance(limit: number = 100) {
    return await this.zktlsClient.tryWithdrawBalance(limit);
  }
}

export async function createPorClient(config: AppConfig, options: any = {}) {
  const client = new PoRClient(config);
  await client.init(options);
  return client;
}
