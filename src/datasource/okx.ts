import ccxt from "ccxt";
import { makeZkTlsRequestParams } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { OkxKind, OkxAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";

export class Okx extends BaseExchange<OkxAccount, OkxKind> {
  constructor(accounts?: DatasourceConfig["okx"]) {
    super(accounts);
  }
  get hasMain() { return this.mainAccounts.length > 0; }
  get mainAccounts() { return this.getAccounts("main"); }


  ///
  /// =======================================================================
  ///

  /// https://www.okx.com/docs-v5/en/#trading-account-rest-api-get-balance
  /// https://www.okx.com/api/v5/account/balance
  public getV5AccountBalance(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasMain) return undefined;

    const signParams = {};
    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      const exchange = new ccxt.okx({
        apiKey: acc.apiKey, secret: acc.apiSecret, password: acc.passphrase, options: {
          recvWindow: this.recvWindow,
        }
      });
      origRequests.push(exchange.sign("account/balance", "private", "GET", { ...signParams }));
    }
    return makeZkTlsRequestParams(origRequests, verifyType);
  }
}
