import { saveToFile } from "../utils.js";
import { Options, getDefaultOptions, RequestParamsInput } from "../types.js";
import { ZkTLSClient } from "./zktls_client.js";
import { ProverClient } from "./prover_client.js";
import { AppConfig } from "../config_schema.js";

export class PoRClient {
  private readonly config: Required<AppConfig>;
  private zktlsClient: ZkTLSClient;
  private proverClient: ProverClient;

  constructor(config: AppConfig) {
    this.config = { ...config };
    this.zktlsClient = new ZkTLSClient({ ...config });
    this.proverClient = new ProverClient(config.services.zkvm.url);
  }

  /**
   * zkTLS + zkVM (optional)
   */
  async run(params: RequestParamsInput, options: Options = {}): Promise<any> {
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
        token: this.config.identity.token,
        projectId: this.config.identity.projectId,
        programId: this.config.identity.programId,
        attestationData: JSON.stringify(attestationData)
      });
      console.log("result", result);
      return result;
    }

    return attestationData;
  }

  async tryWithdrawBalance(limit: number = 100) {
    return await this.zktlsClient.tryWithdrawBalance(limit);
  }
}
