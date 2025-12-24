import { saveToFile } from "../utils.js";
import { Options, getDefaultOptions, RequestParamsInput } from "../types.js";
import { ZkTLSClient } from "./zktls_client.js";
import { ProverClient } from "./prover_client.js";
import { SdkConfig, resolveSdkConfig, printConfig } from "../config.js";

export class PoRClient {
  private readonly config: Required<SdkConfig>;
  private zktlsClient: ZkTLSClient;
  private proverClient: ProverClient;

  constructor(config: SdkConfig = {}) {
    this.config = resolveSdkConfig(config);
    printConfig(this.config, 'PoRClient');
    this.zktlsClient = new ZkTLSClient(this.config);
    this.proverClient = new ProverClient(this.config);
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
      const result = await this.proverClient.doZkVM(JSON.stringify(attestationData));
      console.log("result", result);
      return result;
    }

    return attestationData;
  }
}
