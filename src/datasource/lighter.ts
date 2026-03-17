import { makeZkTlsRequestParams } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { LighterKind, LighterAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";

export class Lighter extends BaseExchange<LighterAccount, LighterKind> {
  constructor(accounts?: DatasourceConfig["lighter"]) {
    super(accounts);
  }
  get hasMain() { return this.mainAccounts.length > 0; }
  get mainAccounts() { return this.getAccounts("main"); }

  ///
  /// =======================================================================
  ///


  /// https://apidocs.lighter.xyz/reference/account-1
  /// https://mainnet.zklighter.elliot.ai/api/v1/account
  public getV1Account(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasMain) return undefined;

    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      if (!acc.accountIndex || acc.accountIndex == "") {
        throw new Error("Lighter accountIndex is empty!")
      }
      if (!acc.poolIndex || acc.poolIndex == "") {
        throw new Error("Lighter poolIndex is empty!")
      }

      // DO NOT CHANGE THE ORDER
      origRequests.push({
        url: `https://mainnet.zklighter.elliot.ai/api/v1/account?by=index&value=${acc.accountIndex}`
        // const accountValue1 = accounts[0].total_asset_value
        // const shares = accounts[0].shares.find(x => x.public_pool_index === poolIndex).shares_amount
      });
      origRequests.push({
        url: `https://mainnet.zklighter.elliot.ai/api/v1/account?by=index&value=${acc.poolIndex}`
        // const poolTotalValue = accounts[0].collateral
        // const totalShares =accounts[0].pool_info.total_shares
        // const sharePrice = poolTotalValue / totalShares;
        // const accountValue2 = shares * sharePrice;
      });
      // const lighterTotal = accountValue1 + accountValue2
    }
    return makeZkTlsRequestParams(origRequests, verifyType);
  }
}

