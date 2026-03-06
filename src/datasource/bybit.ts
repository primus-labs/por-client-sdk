import ccxt from "ccxt";
import { makeZkTlsRequestParams } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { BybitKind, BybitAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";

export class Bybit extends BaseExchange<BybitAccount, BybitKind> {
  constructor(accounts?: DatasourceConfig["bybit"]) {
    super(accounts);
  }
  get hasMain() { return this.mainAccounts.length > 0; }
  get mainAccounts() { return this.getAccounts("main"); }


  ///
  /// =======================================================================
  ///

  /// https://bybit-exchange.github.io/docs/v5/account/wallet-balance
  /// https://api.bybit.com/v5/account/wallet-balance
  public getV5AccountWalletBalance(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasMain) return undefined;

    const signParams = { accountType: "UNIFIED" };
    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      const exchange = new ccxt.bybit({
        apiKey: acc.apiKey, secret: acc.apiSecret, options: {
          recvWindow: this.recvWindow,
        }
      });
      origRequests.push(exchange.sign("v5/account/wallet-balance", "private", "GET", { ...signParams }));
    }
    return makeZkTlsRequestParams(origRequests, verifyType);
  }
}
