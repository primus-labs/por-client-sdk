import { PrimusNetwork } from "@primuslabs/network-core-sdk";
import { ethers } from "ethers";
import { sleepMs } from "../utils.js";
import { Options, RequestParams, RequestParamsInput, VERIFY_TYPE } from "../types.js";
import { Config } from "../config.js";

export class ZkTLSClient {
  private primusNetwork: PrimusNetwork;

  constructor() {
    this.primusNetwork = new PrimusNetwork();
  }

  async doZkTLS(params: RequestParamsInput, options: Options = {}): Promise<any> {
    const requestParams = Array.isArray(params) ? params : [params];
    let attestations: any[] = [];
    for (const reqParams of requestParams) {
      const data = await this._doZkTLS(reqParams, options);
      attestations.push(data.attestationData);
    }
    return attestations;
  }

  /**
   * Main entry: perform ZKTLS attestation and task flow
   * TODO: optimized
   */
  private async _doZkTLS(requestParams: RequestParams, options: Options = {}): Promise<any> {
    if (requestParams.requests.length !== requestParams.responseResolves.length)
      throw new Error("'requests' and 'responseResolves' size mismatch");

    const opts = this._getDefaultOptions(options);

    const provider = new ethers.providers.JsonRpcProvider(Config.RPC_URL);
    const wallet = Config.PRIVATE_KEY ? new ethers.Wallet(Config.PRIVATE_KEY, provider) : provider;
    const { chainId } = await provider.getNetwork();

    const attestParams = {
      address: "0x810b7bacEfD5ba495bB688bbFD2501C904036AB7"
    };

    const startTime = Date.now();

    try {
      await this._initializePrimusNetwork(wallet, chainId);

      // TODO:
      if (Config.ZKTLS_MODE === "DVC") {
      } else if (Config.ZKTLS_MODE === "POR") {
      } else {
      }
      const submitResult = await this._submitZktlsTaskWithRetry(opts, attestParams);

      const attestResult = await this._attestWithRetry(
        requestParams,
        opts,
        attestParams,
        submitResult
      );

      /*const taskResult = */await this._verifyAndPollTaskResultWithRetry(attestResult);

      const zkVmRequestData = await this._prepareZkVmRequestData(requestParams.verifyType, attestResult);

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
    requestParams: RequestParams,
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
        let reqParams = requestParams;

        if (opts.requestParamsCallback) {
          reqParams = opts.requestParamsCallback();
        }

        const params = {
          ...attestParams,
          ...submitResult,
          requests: reqParams.requests,
          responseResolves: reqParams.responseResolves,
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
  private async _prepareZkVmRequestData(verifyType: VERIFY_TYPE, attestResult: any) {
    const taskId = attestResult[0].taskId;
    const plainResponse = this.primusNetwork.getAllJsonResponse(taskId);

    if (!plainResponse) throw new Error("Unable to get plain JSON response");


    if (verifyType == 'HASH_COMPARISON') {
      // todo!
      return {
        attestationData: {
          verification_type: Array.from({ length: plainResponse.length }, () => "HASH_COMPARISON"),
          public_data: attestResult,
          private_data: plainResponse
        },
        requestid: taskId
      };
    } else {
      return {};
    }

  }
}
