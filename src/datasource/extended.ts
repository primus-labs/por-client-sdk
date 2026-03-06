import { makeZkTlsRequestParams } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { ExtendedKind, ExtendedAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";

export class Extended extends BaseExchange<ExtendedAccount, ExtendedKind> {
  constructor(accounts?: DatasourceConfig["extended"]) {
    super(accounts);
  }
  get hasMain() { return this.mainAccounts.length > 0; }
  get mainAccounts() { return this.getAccounts("main"); }

  ///
  /// =======================================================================
  ///

  /// https://api.docs.extended.exchange/#get-balance
  /// https://api.starknet.extended.exchange/api/v1/user/balance
  public getV1UserBalance(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasMain) return undefined;

    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      origRequests.push({
        url: "https://api.starknet.extended.exchange/api/v1/user/balance",
        method: "GET",
        headers: {
          "X-Api-Key": acc.apiKey,
        },
        body: "",
      });
    }
    return makeZkTlsRequestParams(origRequests, verifyType);
  }
}
