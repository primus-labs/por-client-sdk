import ccxt from "ccxt";
import { makeZkTlsRequestParams } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { HyperliquidKind, HyperliquidAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";

export class Hyperliquid extends BaseExchange<HyperliquidAccount, HyperliquidKind> {
  constructor(accounts?: DatasourceConfig["hyperliquid"]) {
    super(accounts);
  }
  get hasMain() { return this.mainAccounts.length > 0; }
  get mainAccounts() { return this.getAccounts("main"); }


  ///
  /// =======================================================================
  ///

  /// https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#retrieve-a-users-subaccounts
  /// https://api.hyperliquid.xyz/info
  public getInfo(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasMain) return undefined;

    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      if (!acc.address || acc.address == "") {
        throw new Error("Hyperliquid address is empty!")
      }

      const signParams = { type: "clearinghouseState", user: acc.address };
      const exchange = new ccxt.hyperliquid();
      origRequests.push(exchange.sign("info", "public", "POST", { ...signParams }));
    }
    return makeZkTlsRequestParams(origRequests, verifyType);
  }
}
