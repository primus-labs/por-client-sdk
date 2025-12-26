import { PrimusNetwork } from "@primuslabs/network-core-sdk";
import { ethers } from "ethers";
import { sleepMs, mockErrorReport, makeErrData } from "../utils.js";
import { Options, getDefaultOptions, RequestParams, RequestParamsInput, VERIFY_TYPE, RequestParamsCallback } from "../types.js";
import { SdkConfig, resolveSdkConfig } from "../config.js";
import { ClientError } from "../error.js";
import { DataServiceClient } from "./data_service_client.js";
import { v4 as uuidv4 } from 'uuid';


export class ZkTLSClient {
  private readonly config: Required<SdkConfig>;
  private primusNetwork: PrimusNetwork;

  constructor(config: SdkConfig = {}) {
    this.config = resolveSdkConfig(config);
    this.primusNetwork = new PrimusNetwork();
  }


  /**
   * Initialize PrimusNetwork SDK
   */
  private async _initializePrimusNetwork(opts: Options, wallet: any, chainId: number): Promise<void> {
    try {
      console.log("🚀 Initializing PrimusNetwork...");
      const result = await this.primusNetwork.init(wallet, chainId, opts.noProxy === true ? "native" : undefined);
      console.log("✅ PrimusNetwork initialized:", result);
    } catch (err: any) {
      throw new ClientError("71002", `Initializing PrimusNetwork failed`, makeErrData(err));
    }
  }

  /**
   * Submit zkTLS task with retry and exponential backoff
   */
  private async _submitZkTLSTaskWithRetry(
    _opts: Options,
    attestParams: any,
    maxRetries = 4,
    baseDelay = 1000
  ): Promise<any> {
    let attempt = 0;
    const start = Date.now();
    console.log("📝 Submitting zkTLS task...");

    while (true) {
      try {
        let result;
        if (this.config.zktlsMode === "DVC") {
          result = await this.primusNetwork.submitTask(attestParams);
        } else if (this.config.zktlsMode === "POR") {
          const client = new DataServiceClient(this.config.dataServiceUrl);
          const bizId = uuidv4();
          const token = this.config.token;
          const projectId = this.config.projectId;
          result = await client.submitTask(bizId, projectId, token);
        }
        console.log(`✅ submitTask done (${Date.now() - start}ms):`, result);
        return result;
      } catch (err: any) {
        const NO_RETRY_CODES = ["72001"]; // from data service client
        if (err instanceof ClientError && NO_RETRY_CODES.includes(err.code)) throw err;

        attempt++;
        console.warn(`⚠️ submitTask attempt ${attempt} failed: ${err.message}`);
        if (attempt > maxRetries) {
          throw new ClientError("71003", `Submitting zkTLS task failed after ${maxRetries} retries`, makeErrData(err));
        }

        const delay = baseDelay * 2 ** (attempt - 1);
        console.warn(`⏳ submitTask retrying in ${delay}ms...`);
        await sleepMs(delay);
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
    requestParamsCallback?: RequestParamsCallback,
    maxRetries = 4,
    baseDelay = 1000
  ): Promise<any> {
    let attempt = 0;
    const start = Date.now();
    console.log("⚙️ Running attestation...");

    while (true) {
      try {
        const reqParams = requestParamsCallback ? requestParamsCallback() : requestParams;
        if (reqParams.requests.length !== reqParams.responseResolves.length) {
          throw new ClientError("71001", `Request params size mismatch ${reqParams.requests.length} != ${reqParams.responseResolves.length}`);
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
        console.log(`✅ attest done (${Date.now() - start}ms):`, result);
        return result;
      } catch (err: any) {
        attempt++;

        if (err) {
          const info: Record<string, any> = {};
          if (err.code) info.code = err.code;
          if (err.message) info.message = err.message;
          if (err.data) info.data = err.data;
          console.warn(`⚠️ attest attempt ${attempt} failed:`, info);

          const NO_RETRY_CODES = ["71001"]; // TODO:
          if (info.code && NO_RETRY_CODES.includes(info.code)) {
            if (err instanceof ClientError) throw err;
            throw new ClientError("71004", `Attesting zkTLS failed`, makeErrData(err));
          }
        }

        if (attempt > maxRetries) {
          throw new ClientError("71005", `Attesting zkTLS failed after ${maxRetries} retries`, makeErrData(err));
        }

        const delay = baseDelay * 2 ** (attempt - 1);
        console.warn(`⏳ attest retrying in ${delay}ms...`);
        await sleepMs(delay);
      }
    }
  }

  /**
   * Verify and poll task result with retries
   */
  private async _verifyAndPollTaskResultWithRetry(
    attestResult: any,
    maxRetries = 4,
    baseDelay = 1000
  ): Promise<any> {
    let attempt = 0;
    const start = Date.now();
    console.log("🔍 Verifying task...");

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
        if (attempt > maxRetries) {
          throw new ClientError("71006", `Verifying task failed after ${maxRetries} retries`, makeErrData(err));
        }

        const delay = baseDelay * 2 ** (attempt - 1);
        console.warn(`⏳ verify retrying in ${delay}ms...`);
        await sleepMs(delay);
      }
    }
  }

  /**
   * Prepare final zkVM attestation data
   */
  private async _prepareZkVmRequestData(verifyType: VERIFY_TYPE, attestResult: any) {
    const taskId = attestResult[0].taskId;
    const plainResponse = this.primusNetwork.getAllJsonResponse(taskId);

    if (!plainResponse) {
      throw new ClientError("71007", `Unable to get plain JSON response.`);
    }

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


  /**
   * Main entry: perform zkTLS attestation and task flow
   */
  private async _doZkTLS(requestParams: RequestParams, options: Options = {}, requestParamsCallback?: RequestParamsCallback): Promise<any> {
    const startTime = Date.now();
    const attestParams = {
      address: "0x9b7706746c6e19AD5EB5c1DaeEa4b4C09EEC8a5f"
    };

    const opts = getDefaultOptions(options);
    try {
      const provider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl);
      const wallet = this.config.privateKey ? new ethers.Wallet(this.config.privateKey, provider) : provider;
      const { chainId } = await provider.getNetwork();

      await this._initializePrimusNetwork(opts, wallet, chainId);

      const submitResult = await this._submitZkTLSTaskWithRetry(opts, attestParams);

      const attestResult = await this._attestWithRetry(
        requestParams,
        opts,
        attestParams,
        submitResult,
        requestParamsCallback,
      );

      await this._verifyAndPollTaskResultWithRetry(attestResult);

      const zkVmRequestData = await this._prepareZkVmRequestData(requestParams.verifyType, attestResult);

      console.log(`✅ Total execution time: ${Date.now() - startTime}ms`);

      return zkVmRequestData;
    } catch (err: any) {
      if (!(err instanceof ClientError)) {
        err = new ClientError("71099", `Do zkTLS failed`, makeErrData(err));
      }
      await mockErrorReport(err);

      throw err;
    }
  }
  async doZkTLS(params: RequestParamsInput, options: Options = {}): Promise<any> {
    const requestParams = Array.isArray(params) ? params : [params];
    const callbacks: (RequestParamsCallback | undefined)[] = options.requestParamsCallback
      ? Array.isArray(options.requestParamsCallback) ? options.requestParamsCallback : [options.requestParamsCallback]
      : [];

    if (callbacks.length > 0 && callbacks.length !== requestParams.length) {
      throw new ClientError("71008", `Request params size ${requestParams.length} != callbacks size ${callbacks.length}`);
    }

    let attestations: any[] = [];
    for (let i = 0; i < requestParams.length; i++) {
      const data = await this._doZkTLS(requestParams[i], options, callbacks[i]);
      attestations.push(data.attestationData);
    }
    return attestations;
  }
}
