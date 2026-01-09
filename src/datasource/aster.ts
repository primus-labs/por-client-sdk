import { makeHashComparisonParams, signQuery } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { AsterKind, AsterAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";


// TODO: make as utility
function makerAsterOrigRequests(url: string, accounts: AsterAccount[], params = {}) {
  const recvWindow = 60; // Number(process.env.RECV_WINDOW) || 60;
  let signParams = { ...params, recvWindow: recvWindow * 1000 };

  let origRequests = []
  for (const acc of accounts) {
    const timestamp = Date.now();
    const query = signQuery(acc.apiSecret, { ...signParams, timestamp });

    const origRequest = {
      url: `${url}?${query}`,
      headers: { "X-MBX-APIKEY": acc.apiKey }
    };

    origRequests.push(origRequest);
  }

  return origRequests;
}


export class Aster extends BaseExchange<AsterAccount, AsterKind> {
  constructor(accounts?: DatasourceConfig["aster"]) {
    super(accounts);
  }
  get hasSpot() { return this.spotAccounts.length > 0; }
  get hasUsdSFutures() { return this.usdSFuturesAccounts.length > 0; }
  get spotAccounts() { return this.getAccounts("spot"); }
  get usdSFuturesAccounts() { return this.getAccounts("usds-futures"); }

  ///
  /// =======================================================================
  ///

  /// TODO: more general interfaces
  ///       a map for any api

  /// doc: https://github.com/asterdex/api-docs/blob/master/aster-finance-spot-api.md#account-information-user_data
  /// api: https://sapi.asterdex.com/api/v1/account
  public getSpotAccountRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasSpot) return undefined;

    const url = "https://sapi.asterdex.com/api/v1/account";
    const origRequests = makerAsterOrigRequests(url, this.spotAccounts);
    return makeHashComparisonParams(origRequests, verifyType);
  }

  /// doc: https://github.com/asterdex/api-docs/blob/master/aster-finance-futures-api.md#futures-account-balance-v2-user_data
  /// api: https://fapi.asterdex.com/fapi/v2/balance
  public getUsdSFutureBalanceRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasUsdSFutures) return undefined;

    const url = "https://fapi.asterdex.com/fapi/v2/balance";
    const origRequests = makerAsterOrigRequests(url, this.usdSFuturesAccounts);
    return makeHashComparisonParams(origRequests, verifyType);
  }
}
