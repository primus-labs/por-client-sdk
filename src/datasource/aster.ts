import { makeHashComparisonParams, signQuery } from "./helper.js";
import { VERIFY_TYPE, RequestParams } from "../types.js";
import { GeneralAccount } from "./account.js";


// TODO: make as utility
function makerAsterOrigRequests(url: string, accounts: any[], params = {}) {
  const recvWindow = 60; // Number(process.env.RECV_WINDOW) || 60;
  let signParams = { ...params, recvWindow: recvWindow * 1000 };

  let origRequests = []
  for (const acc of accounts) {
    const timestamp = Date.now();
    const query = signQuery(acc.secret, { ...signParams, timestamp });

    const origRequest = {
      url: `${url}?${query}`,
      headers: { "X-MBX-APIKEY": acc.key }
    };

    origRequests.push(origRequest);
  }

  return origRequests;
}

export class Aster {
  constructor() {
  }

  /// doc: https://github.com/asterdex/api-docs/blob/master/aster-finance-spot-api.md#account-information-user_data
  /// api: https://sapi.asterdex.com/api/v1/account
  public getSpotAccountRequests(accounts: GeneralAccount[], verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParams {
    const url = "https://sapi.asterdex.com/api/v1/account";
    const origRequests = makerAsterOrigRequests(url, accounts);
    return makeHashComparisonParams(origRequests, verifyType);
  }
  /// doc: https://github.com/asterdex/api-docs/blob/master/aster-finance-futures-api.md#futures-account-balance-v2-user_data
  /// api: https://fapi.asterdex.com/fapi/v2/balance
  public getFutureBalanceRequests(accounts: GeneralAccount[], verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParams {
    const url = "https://fapi.asterdex.com/fapi/v2/balance";
    const origRequests = makerAsterOrigRequests(url, accounts);
    return makeHashComparisonParams(origRequests, verifyType);
  }
}
