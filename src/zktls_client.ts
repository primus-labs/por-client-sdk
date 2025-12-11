import { PrimusNetwork } from "@primuslabs/network-core-sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";
import { sleepMs } from "./utils.js";

dotenv.config();

interface RequestParams {
  requests: any[];
  responseResolves: any[];
}

interface Options {
  sslCipher?: string;
  algorithmType?: string;
  specialTask?: any;
  noProxy?: boolean;
  runZkvm?: boolean;
  requestParamsCallback?: () => RequestParams;
}

export class ZkTLSClient {
  private primusNetwork: PrimusNetwork;

  constructor() {
    this.primusNetwork = new PrimusNetwork();
  }

  /**
   * Main entry: perform ZKTLS attestation and task flow
   */
  async doZkTLS(
    requests: any[],
    responseResolves: any[],
    options: Options = {}
  ): Promise<any> {
    const opts = this._getDefaultOptions(options);

    this._validateInput(requests, responseResolves);
    await this._validateEnvVars();

    const { PRIVATE_KEY, CHAIN_ID, RPC_URL } = process.env;

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);

    const attestParams = {
      address: "0x810b7bacEfD5ba495bB688bbFD2501C904036AB7"
    };

    const startTime = Date.now();

    try {
      await this._initializePrimusNetwork(wallet, Number(CHAIN_ID));

      const submitResult = await this._submitZktlsTaskWithRetry(opts, attestParams);

      const attestResult = await this._attestWithRetry(
        requests,
        responseResolves,
        opts,
        attestParams,
        submitResult
      );

      const taskResult = await this._verifyAndPollTaskResultWithRetry(attestResult);

      const zkVmRequestData = await this._prepareZkVmRequestData(taskResult, attestResult);

      console.log(`✅ Total execution time: ${Date.now() - startTime}ms`);

      return zkVmRequestData;
    } catch (err: any) {
      throw new Error(`ZKTLS execution failed: ${err.message || err}`);
    }
  }

  /**
   * Default options for ZKTLS attestation
   */
  private _getDefaultOptions(options: Options): Options {
    const defaults: Options = {
      sslCipher: "ECDHE-RSA-AES128-GCM-SHA256",
      algorithmType: "mpctls",
      specialTask: undefined,
      noProxy: true,
      runZkvm: true,
      requestParamsCallback: undefined,
    };
    return { ...defaults, ...options };
  }

  /**
 * Validate request and response array inputs
 */
  private _validateInput(requests: any[], responseResolves: any[]) {
    if (!Array.isArray(requests) || requests.length === 0)
      throw new Error("Invalid 'requests'");
    if (!Array.isArray(responseResolves))
      throw new Error("Invalid 'responseResolves'");
    if (requests.length !== responseResolves.length)
      throw new Error("'requests' and 'responseResolves' size mismatch");
  }

  /**
   * Ensure all required environment variables are present
   */
  private async _validateEnvVars(): Promise<void> {
    const required = ["PRIVATE_KEY", "CHAIN_ID", "RPC_URL"];
    for (const key of required) {
      if (!process.env[key]) throw new Error(`Missing env: ${key}`);
    }
  }

  /**
   * Initialize PrimusNetwork SDK
   */
  private async _initializePrimusNetwork(wallet: any, chainId: number): Promise<void> {
    try {
      console.log("🚀 Initializing PrimusNetwork...");
      const result = await this.primusNetwork.init(wallet, chainId, "native");
      console.log("✅ PrimusNetwork initialized:", result);
    } catch (err: any) {
      throw new Error(`PrimusNetwork init failed: ${err.message || err}`);
    }
  }

  /**
   * Submit ZKTLS task with retry and exponential backoff
   */
  private async _submitZktlsTaskWithRetry(
    _opts: Options,
    attestParams: any,
    maxRetries = 5,
    baseDelay = 1000
  ): Promise<any> {
    let attempt = 0;
    const start = Date.now();

    console.log("📝 Submitting ZKTLS task...");

    while (true) {
      try {
        const result = await this.primusNetwork.submitTask(attestParams);
        console.log(`✅ submitTask done (${Date.now() - start}ms):`, result);
        return result;
      } catch (err: any) {
        attempt++;
        console.warn(`⚠️ submitTask attempt ${attempt} failed: ${err.message}`);

        if (attempt > maxRetries)
          throw new Error(`submitTask failed after ${maxRetries} retries`);

        await sleepMs(baseDelay * 2 ** (attempt - 1));
      }
    }
  }

  /**
   * Run attestation with retries
   */
  private async _attestWithRetry(
    requests: any[],
    responseResolves: any[],
    opts: Options,
    attestParams: any,
    submitResult: any,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<any> {
    let attempt = 0;
    const start = Date.now();

    console.log("⚙️ Running attestation...");

    while (true) {
      try {
        let reqs = requests;
        let resps = responseResolves;

        if (opts.requestParamsCallback) {
          const cb = opts.requestParamsCallback();
          reqs = cb.requests;
          resps = cb.responseResolves;
        }

        const params = {
          ...attestParams,
          ...submitResult,
          requests: reqs,
          responseResolves: resps,
          sslCipher: opts.sslCipher,
          attMode: { algorithmType: opts.algorithmType },
          specialTask: opts.specialTask,
          noProxy: opts.noProxy,
          getAllJsonResponse: "true"
        };

        const result = await this.primusNetwork.attest(params, 5 * 60 * 1000);

        if (!result?.[0]?.attestation) throw new Error("Invalid attestation result");
        console.log(`✅ attest done (${Date.now() - start}ms):`, result);

        return result;
      } catch (err: any) {
        attempt++;
        console.warn(`⚠️ attest attempt ${attempt} failed: ${err.message}`);

        if (attempt > maxRetries)
          throw new Error(`attest failed after ${maxRetries} retries`);

        await sleepMs(baseDelay * 2 ** (attempt - 1));
      }
    }
  }

  /**
   * Verify and poll task result with retries
   */
  private async _verifyAndPollTaskResultWithRetry(
    attestResult: any,
    maxRetries = 5,
    baseDelay = 1000
  ): Promise<any> {
    let attempt = 0;
    const start = Date.now();

    console.log("🔍 Polling task result...");

    while (true) {
      try {
        const result = await this.primusNetwork.verifyAndPollTaskResult({
          taskId: attestResult[0].taskId,
          reportTxHash: attestResult[0].reportTxHash
        });
        console.log(`✅ verify done (${Date.now() - start}ms):`, result);
        return result;
      } catch (err: any) {
        attempt++;
        console.warn(`⚠️ verify attempt ${attempt} failed: ${err.message}`);

        if (attempt > maxRetries)
          throw new Error(`verifyAndPollTaskResult failed after ${maxRetries} retries`);

        await sleepMs(baseDelay * 2 ** (attempt - 1));
      }
    }
  }

  /**
   * Prepare final zkVM attestation data
   */
  private async _prepareZkVmRequestData(_taskResult: any, attestResult: any) {
    const taskId = attestResult[0].taskId;
    const plainResponse = this.primusNetwork.getAllJsonResponse(taskId);

    if (!plainResponse) throw new Error("Unable to get plain JSON response");

    return {
      attestationData: {
        verification_type: "HASH_COMPARISON",
        public_data: attestResult,
        private_data: { plain_json_response: plainResponse }
      },
      requestid: taskId
    };
  }
}
