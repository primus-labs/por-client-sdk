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
  async run(requestParams: RequestParamsInput, options: Options = {}): Promise<any> {
    const opts = getDefaultOptions(options);

    console.log("do zkTLS");
    const attestationData = await this.zktlsClient.doZkTLS(requestParams, opts);
    if (attestationData) {
      // optional
      saveToFile("attestation.json", JSON.stringify(attestationData));
    }

    if (opts.runZkvm && attestationData) {
      console.log("do zkVM");
      const result = await this.proverClient.doZkVM({
        token: this.config.identity.token,
        projectId: this.config.identity.projectId,
        programId: this.config.identity.programId,
        attestationData: JSON.stringify(attestationData),
        zktlsMode: this.config.runtime.mode,
      });
      console.log("result", result);
      return result;
    }

    return attestationData;
  }
}
