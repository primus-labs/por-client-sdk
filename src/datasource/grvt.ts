import { makeZkTlsRequestParams } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { GrvtKind, GrvtAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";
import axios from "axios";

type AuthInfo = {
  cookie: string
  accountId: string
  expireAt: number
}

export class Grvt extends BaseExchange<GrvtAccount, GrvtKind> {
  constructor(accounts?: DatasourceConfig["grvt"]) {
    super(accounts);
  }
  get hasMain() { return this.mainAccounts.length > 0; }
  get mainAccounts() { return this.getAccounts("main"); }

  ///
  /// =======================================================================
  ///
  private authCache = new Map<string, AuthInfo>()
  // private readonly GRVT_AUTH_ENDPOINT = "https://edge.testnet.grvt.io/auth/api_key/login"; // test
  private readonly GRVT_AUTH_ENDPOINT = "https://edge.grvt.io/auth/api_key/login"; // prod

  async _getAuthInfo(apiKey: string): Promise<AuthInfo> {
    const cached = this.authCache.get(apiKey)

    if (cached && Date.now() < cached.expireAt + 3600_000) {
      return cached
    }

    const res = await axios.post(
      this.GRVT_AUTH_ENDPOINT,
      { api_key: apiKey },
      {
        headers: {
          "Content-Type": "application/json",
          "Cookie": "rm=true;",
        },
        validateStatus: () => true,
      }
    );

    const cookies = res.headers["set-cookie"] || [];
    const gravityCookie = cookies.find((c: string) => c.startsWith("gravity="));
    const accountId = res.headers["x-grvt-account-id"];
    if (!gravityCookie || !accountId) {
      throw new Error("GRVT auth failed")
    }
    const cookie = gravityCookie.split(";")[0]

    const authInfo: AuthInfo = {
      cookie,
      accountId,
      expireAt: Date.now()
    }
    // console.log("authInfo:", authInfo);

    return authInfo
  }

  ///
  /// =======================================================================
  ///

  /// https://api-docs.grvt.io/trading_api/#sub-account-summary-request
  /// https://trades.grvt.io/full/v1/account_summary
  public async getV1AccountSummary(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): Promise<RequestParamsOutput> {
    if (!this.hasMain) return undefined;

    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      if (!acc.subAccountId || acc.subAccountId == "") {
        throw new Error("GRVT subAccountId is empty!")
      }
      const authInfo = await this._getAuthInfo(acc.apiKey);

      origRequests.push({
        url: "https://trades.grvt.io/full/v1/account_summary",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cookie": authInfo.cookie,
          "X-Grvt-Account-Id": authInfo.accountId
        },
        body: {
          "sub_account_id": acc.subAccountId
        },
      });
    }
    return makeZkTlsRequestParams(origRequests, verifyType);
  }

  /// https://api-docs.grvt.io/trading_api/#vault-investor-summary-request
  /// https://trades.grvt.io/full/v1/vault_investor_summary
  public async getV1VaultInvestorSummary(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): Promise<RequestParamsOutput> {
    if (!this.hasMain) return undefined;

    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      if (!acc.vaultId || acc.vaultId == "") {
        throw new Error("GRVT vaultId is empty!")
      }
      const authInfo = await this._getAuthInfo(acc.apiKey);

      origRequests.push({
        url: "https://trades.grvt.io/full/v1/vault_investor_summary",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cookie": authInfo.cookie,
          "X-Grvt-Account-Id": authInfo.accountId
        },
        body: {
          "vault_id": acc.vaultId
        },
      });
    }
    return makeZkTlsRequestParams(origRequests, verifyType);
  }
}
