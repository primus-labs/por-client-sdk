import { PrimusNetwork } from "@primuslabs/network-core-sdk";
import { TokenSymbol } from "@primuslabs/network-core-sdk/dist/types";
import { ethers } from "ethers";
import { sleepMs, makeErrData } from "../utils.js";
import { Options, getDefaultOptions, RequestParams, VERIFY_TYPE, RequestParamsInput, RequestParamsCallback } from "../types.js";
import { ClientError } from "../error.js";
import { DataServiceClient } from "./data_service_client.js";
import { v4 as uuidv4 } from 'uuid';
import { AppConfig } from "../config_schema.js";


type PLAN_TYPE = 'SELF' | 'SUBSCRIPTION' | 'UNKNOWN';
export class ZkTLSClient {
  private readonly config: Required<AppConfig>;
  private primusNetwork: PrimusNetwork;
  private planType: PLAN_TYPE;

  constructor(config: AppConfig) {
    this.config = { ...config };
    this.primusNetwork = new PrimusNetwork();
    this.planType = 'UNKNOWN';
  }


  /**
   * Initialize PrimusNetwork SDK
   */
  private async _initializePrimusNetwork(opts: Options, wallet: any, chainId: number): Promise<void> {
    try {
      console.log("🚀 Initializing PrimusNetwork...");
      const result = await this.primusNetwork.init(
        wallet,
        chainId,
        opts.noProxy === true ? "native" : undefined,
        opts.projectName,
        { algorithmVersion: opts.algorithmVersion }
      );
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
        {
          const client = new DataServiceClient(this.config.services.data.url);
          const bizId = uuidv4();
          const userToken = this.config.identity.userToken;
          const projectId = this.config.identity.projectId;
          const { subscriptionType, disableOffchain } = await client.checkPayment(bizId, projectId, userToken);
          console.log(`SubscriptionType: ${subscriptionType}`);
          if (disableOffchain === true) {
            throw new ClientError("71009", "Disabled offchain.");
          }
          this.planType = 'SUBSCRIPTION';
          if (subscriptionType === "PLAN_SELF_PAID") {
            this.planType = 'SELF';
            if (!this.config.blockchain.signer?.privateKey) {
              throw new ClientError("71008", "Please set your private key at `app.blockchain.signer.privateKey`");
            }
          }
        }

        let result;
        if (this.planType === 'SELF') {
          result = await this.primusNetwork.submitTask(attestParams);
        } else if (this.planType === 'SUBSCRIPTION') {
          const client = new DataServiceClient(this.config.services.data.url);
          const bizId = uuidv4();
          const userToken = this.config.identity.userToken;
          const projectId = this.config.identity.projectId;
          const { taskId, taskTxHash, taskAttestors, submitterAddress } = await client.submitTask(bizId, projectId, userToken);
          result = { taskId, taskTxHash, taskAttestors };
          attestParams.address = submitterAddress;
        }
        console.log(`✅ submitTask done (${Date.now() - start}ms):`, result);
        return result;
      } catch (err: any) {
        const NO_RETRY_CODES = ["72001", "71008", "71009"]; // from data service client
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
        const reqParams = requestParamsCallback ? await requestParamsCallback() : requestParams;
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
          getAllJsonResponse: "true",
          extendedParams: JSON.stringify({
            attUrlOptimization: reqParams.options?.attUrlOptimization ?? opts.attUrlOptimization // optimization the url of attestation.
          }),
        };

        const result = await this.primusNetwork.attest(params, 10 * 60 * 1000, { "projectId": this.config.identity.projectId });
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
          if (info.code && info.code === "00001") { // Algorithm startup exception.
            await sleepMs(60 * 1000);
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
    baseDelay = 2000
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
        verification_type: Array.from({ length: plainResponse.length }, () => "HASH_COMPARISON"),
        public_data: attestResult,
        private_data: plainResponse
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

    const opts = getDefaultOptions(options);
    try {
      let rpcUrl = this.config.blockchain.rpcUrl;
      if (!rpcUrl) {
        // TODO: using mapping
        const network = this.config.blockchain.network;
        if (network === "base") { rpcUrl = "https://mainnet.base.org"; }
        else if (network === "base-sepolia") { rpcUrl = "https://sepolia.base.org"; }
        else if (network === "bsc-mainnet") { rpcUrl = "https://bsc-dataseed.bnbchain.org"; }
        else if (network === "bsc-testnet") { rpcUrl = "https://bsc-testnet-dataseed.bnbchain.org"; }
      }
      if (!rpcUrl) {
        throw new ClientError("71010", "RPC url is empty.");
      }

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const privateKey = this.config.blockchain.signer?.privateKey;
      const wallet = privateKey ? new ethers.Wallet(privateKey, provider) : provider;
      const { chainId } = await provider.getNetwork();

      const attestParams = { address: "" };
      if (privateKey) {
        attestParams.address = (wallet as ethers.Wallet).address;
      }

      await this._initializePrimusNetwork(opts, wallet, chainId);

      const submitResult = await this._submitZkTLSTaskWithRetry(opts, attestParams, 4, 5000);

      const attestResult = await this._attestWithRetry(
        requestParams,
        opts,
        attestParams,
        submitResult,
        requestParamsCallback,
        4, 5000,
      );

      await this._verifyAndPollTaskResultWithRetry(attestResult);

      const zkVmRequestData = await this._prepareZkVmRequestData(requestParams.verifyType, attestResult);

      console.log(`✅ Total execution time: ${Date.now() - startTime}ms`);

      return zkVmRequestData;
    } catch (err: any) {
      if (!(err instanceof ClientError)) {
        err = new ClientError("71099", `Do zkTLS failed`, makeErrData(err));
      }

      throw err;
    }
  }

  async doZkTLS(params: RequestParamsInput, options: Options = {}): Promise<Record<string, any>> {
    const attestations: Record<string, any> = {}; // key => attestation

    for (const [key, cb] of Object.entries(params)) {
      if (!cb) continue; // skip undefined cb
      const reqParams = await cb();
      if (!reqParams) continue; // skip undefined requestParams

      console.log(`Run ${key}`)
      attestations[key] = await this._doZkTLS(reqParams, options, cb as RequestParamsCallback);
    }

    attestations["__meta__"] = {
      projectId: this.config.identity.projectId,
    }

    return attestations;
  }

  async tryWithdrawBalance(limit: number = 100) {
    if (this.planType != "SELF") return true;

    try {
      await this.primusNetwork.withdrawBalance(TokenSymbol.ETH, limit);
      return true;
    } catch (err: any) {
      console.log("tryWithdrawBalance failed:", err?.message, JSON.stringify(err));
    }
    return false;
  }
}
