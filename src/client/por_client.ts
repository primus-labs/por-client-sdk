import { saveToFile } from "../utils.js";
import { Options, RequestParamsInput } from "../types.js";
import { ZkTLSClient } from "./zktls_client.js";
import { ProverClient } from "./prover_client.js";

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
      saveToFile("attestation.json", JSON.stringify(attestationData));

      console.log("do prove");

      const submitResult = await this.proverClient.submitTask(JSON.stringify(attestationData))
      console.log("submitResult", submitResult);
      const result = await this.proverClient.getResult(submitResult.task_id);
      console.log("result", result);
      return result;
    }
    return attestationData;
  }
}
