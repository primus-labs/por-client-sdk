import { saveToFile } from "../utils.js";
import { Options, RequestParamsInput } from "../types.js";
import { ZkTLSClient } from "./zktls_client.js";
import { ProverClient } from "./prover_client.js";
import { Config } from "config.js";

export class PoRClient {
  private zktlsClient: ZkTLSClient;
  private proverClient: ProverClient;

  constructor() {
    this.zktlsClient = new ZkTLSClient();
    this.proverClient = new ProverClient();
  }

  /**
   * zkTLS + zkVM (optional)
   */
  async run(requestParams: RequestParamsInput, options: Options = {}): Promise<any> {
    console.log("do zkTLS");
    const attestationData = await this.zktlsClient.doZkTLS(requestParams, options);
    if (attestationData) {
      // optional
      saveToFile("attestation.json", JSON.stringify(attestationData));
    }

    if (options?.runZkvm && attestationData) {
      console.log("do zkVM");
      const result = await this.proverClient.doZkVM(JSON.stringify(attestationData), Config.PROGRAM_ID)
      console.log("result", result);
      return result;
    }

    return attestationData;
  }
}
