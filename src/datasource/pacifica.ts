import { makeZkTlsRequestParams } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { PacificaKind, PacificaAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";

export class Pacifica extends BaseExchange<PacificaAccount, PacificaKind> {
  constructor(accounts?: DatasourceConfig["pacifica"]) {
    super(accounts);
  }
  get hasMain() { return this.mainAccounts.length > 0; }
  get mainAccounts() { return this.getAccounts("main"); }

  ///
  /// =======================================================================
  ///


  /// https://pacifica.gitbook.io/docs/api-documentation/api/rest-api/account/get-account-info
  /// https://api.pacifica.fi/api/v1/account
  public getV1Account(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasMain) return undefined;

    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      if (!acc.address || acc.address == "") {
        throw new Error("Pacifica address is empty!")
      }

      origRequests.push({
        url: `https://api.pacifica.fi/api/v1/account?account=${acc.address}`,
      });
    }
    return makeZkTlsRequestParams(origRequests, verifyType);
  }
}

