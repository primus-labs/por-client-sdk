import { makeZkTlsRequestParams, readRequestFile } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { MoomooKind, MoomooAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";
import paths from "../paths.js";

export class Moomoo extends BaseExchange<MoomooAccount, MoomooKind> {
  constructor(accounts?: DatasourceConfig["moomoo"]) {
    super(accounts);
  }
  get hasMain() { return this.mainAccounts.length > 0; }
  get mainAccounts() { return this.getAccounts("main"); }


  ///
  /// =======================================================================
  ///


  /// User request file
  public getByRequestFile(verifyType: VERIFY_TYPE = 'HASH_COMPARISON', options: any = {}): RequestParamsOutput {
    if (!this.hasMain) return undefined;

    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      if (!acc.requestFile || acc.requestFile == "") {
        throw new Error("Moomoo requestFile is empty!")
      }
      const requests = readRequestFile(`${paths.requestDataDir}/${acc.requestFile}`);
      origRequests.push(...requests);
    }
    return makeZkTlsRequestParams(origRequests, verifyType, options);
  }
}
