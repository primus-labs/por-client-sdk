import ccxt from "ccxt";
import { makeHashComparisonParams } from "./helper.js";
import { VERIFY_TYPE, RequestParamsOutput } from "../types.js";
import { BinanceKind, BinanceAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";


export class Binance extends BaseExchange<BinanceAccount, BinanceKind> {
  constructor(accounts?: DatasourceConfig["binance"]) {
    super(accounts);
  }

  get hasSpot() { return this.spotAccounts.length > 0; }
  get hasUsdSFutures() { return this.usdSFuturesAccounts.length > 0; }
  get hasCoinFutures() { return this.coinFuturesAccounts.length > 0; }
  get hasUnified() { return this.unifiedAccounts.length > 0; }
  get hasMargin() { return this.marginAccounts.length > 0; }
  get spotAccounts() { return this.getAccounts("spot"); }
  get usdSFuturesAccounts() { return this.getAccounts("usds-futures"); }
  get coinFuturesAccounts() { return this.getAccounts("coin-futures"); }
  get unifiedAccounts() { return this.getAccounts("unified"); }
  get marginAccounts() { return this.getAccounts("margin"); }

  ///
  /// =======================================================================
  ///

  /// TODO: more general interfaces
  ///       a map for any api


  /// doc: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/account-endpoints#account-information-user_data
  /// api: https://api.binance.com/api/v3/account
  public getSpotAccountInfoRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasSpot) return undefined;

    const signParams = { recvWindow: this.recvWindow };
    const origRequests: any[] = [];
    for (const acc of this.spotAccounts) {
      const exchange = new ccxt.binance({ apiKey: acc.apiKey, secret: acc.apiSecret });
      origRequests.push(exchange.sign("account", "private", "GET", { ...signParams, omitZeroBalances: true }));
    }
    return makeHashComparisonParams(origRequests, verifyType);
  }

  /// doc: https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Futures-Account-Balance-V3
  /// api: https://fapi.binance.com/fapi/v3/balance
  public getUsdSFutureAccountBalanceV3Requests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasUsdSFutures) return undefined;

    const signParams = { recvWindow: this.recvWindow };
    const origRequests: any[] = [];
    for (const acc of this.usdSFuturesAccounts) {
      const exchange = new ccxt.binance({ apiKey: acc.apiKey, secret: acc.apiSecret });
      origRequests.push(exchange.sign("balance", "fapiPrivateV3", "GET", { ...signParams }));
    }
    return makeHashComparisonParams(origRequests, verifyType);
  }

  /// doc: https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Futures-Account-Balance
  /// api: https://dapi.binance.com/dapi/v1/balance
  public getCoinFutureAccountBalanceRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasCoinFutures) return undefined;

    const signParams = { recvWindow: this.recvWindow };
    const origRequests: any[] = [];
    for (const acc of this.usdSFuturesAccounts) {
      const exchange = new ccxt.binance({ apiKey: acc.apiKey, secret: acc.apiSecret });
      origRequests.push(exchange.sign("balance", "dapiPrivate", "GET", { ...signParams }));
    }
    return makeHashComparisonParams(origRequests, verifyType);
  }

  /// doc: https://developers.binance.com/docs/derivatives/portfolio-margin/account
  /// api: https://papi.binance.com/papi/v1/balance
  public getUnifiedAccountBalanceRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasUnified) return undefined;

    const signParams = { recvWindow: this.recvWindow };
    const origRequests: any[] = [];
    for (const acc of this.unifiedAccounts) {
      const exchange = new ccxt.binance({ apiKey: acc.apiKey, secret: acc.apiSecret });
      // origRequests.push(exchange.sign("um/positionRisk", "papi", "GET", signParams));
      origRequests.push(exchange.sign("balance", "papi", "GET", { ...signParams }));
    }
    return makeHashComparisonParams(origRequests, verifyType);
  }

  /// doc: https://developers.binance.com/docs/margin_trading/account/Query-Isolated-Margin-Account-Info
  /// api: https://api.binance.com/sapi/v1/margin/isolated/account
  public getMarginAccountBalanceRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParamsOutput {
    if (!this.hasMargin) return undefined;

    const signParams = { recvWindow: this.recvWindow };
    const origRequests: any[] = [];
    for (const acc of this.marginAccounts) {
      const exchange = new ccxt.binance({ apiKey: acc.apiKey, secret: acc.apiSecret });
      origRequests.push(exchange.sign("margin/isolated/account", "sapi", "GET", { ...signParams }));
    }
    return makeHashComparisonParams(origRequests, verifyType);
  }
}
