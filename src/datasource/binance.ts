import ccxt from "ccxt";
import { makeHashComparisonParams } from "./helper.js";
import { VERIFY_TYPE, RequestParams } from "../types.js";
import { GeneralAccount } from "./account.js";


/// TODO: a map for any api
export class Binance {
  private accounts: GeneralAccount[];
  private readonly recvWindow: number;

  constructor() {
    this.recvWindow = Number(process.env.BINANCE_RECV_WINDOW || 60) * 1000;
    this.accounts = this.loadAccounts();
  }

  private loadAccounts(): GeneralAccount[] {
    const accounts: GeneralAccount[] = [];

    const _add = (key?: string, secret?: string) => {
      if (key && secret) accounts.push({ key, secret });
    };

    _add(process.env.BINANCE_API_KEY, process.env.BINANCE_API_SECRET);
    for (let i = 1; i <= 100; i++) {
      _add(process.env[`BINANCE_API_KEY${i}`], process.env[`BINANCE_API_SECRET${i}`]);
    }

    if (accounts.length === 0) {
      throw new Error("Please configure at least one set of BINANCE_API_KEY{i} / BINANCE_API_SECRET{i} in .env.");
    }

    const seen = new Set<string>();
    for (const acc of accounts) {
      const key = `${acc.key}${acc.secret}`;
      if (seen.has(key)) throw new Error("Duplicate BINANCE_API_KEY{i} detected");
      seen.add(key);
    }

    return accounts;
  }

  public getUnifiedAccountRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParams {
    const signParams = { recvWindow: this.recvWindow };

    const origRequests: any[] = [];
    for (const acc of this.accounts) {
      const exchange = new ccxt.binance({ apiKey: acc.key, secret: acc.secret });
      origRequests.push(exchange.sign("um/positionRisk", "papi", "GET", signParams));
      origRequests.push(exchange.sign("balance", "papi", "GET", signParams));
    }

    return makeHashComparisonParams(origRequests, verifyType);
  }

  public getSpotAccountRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParams {
    const origRequests: any[] = [];
    const signParams = { recvWindow: this.recvWindow };

    for (const acc of this.accounts) {
      const exchange = new ccxt.binance({ apiKey: acc.key, secret: acc.secret });

      origRequests.push(
        exchange.sign("account", "private", "GET", { ...signParams, omitZeroBalances: true })
      );
    }

    return makeHashComparisonParams(origRequests, verifyType);
  }

  public getAccounts(): GeneralAccount[] {
    return this.accounts;
  }


  /// doc: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/account-endpoints#account-information-user_data
  /// api: https://api.binance.com/api/v3/account
  public getSpotAccountInfoRequests(accounts: GeneralAccount[], verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParams {
    const signParams = { recvWindow: this.recvWindow };
    const origRequests: any[] = [];
    for (const acc of accounts) {
      const exchange = new ccxt.binance({ apiKey: acc.key, secret: acc.secret });
      origRequests.push(exchange.sign("account", "private", "GET", { ...signParams, omitZeroBalances: true }));
    }
    return makeHashComparisonParams(origRequests, verifyType);
  }

  /// doc: https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Futures-Account-Balance-V3
  /// api: https://fapi.binance.com/fapi/v3/balance
  public getUSDSFutureAccountBalanceV3Requests(accounts: GeneralAccount[], verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParams {
    const signParams = { recvWindow: this.recvWindow };
    const origRequests: any[] = [];
    for (const acc of accounts) {
      const exchange = new ccxt.binance({ apiKey: acc.key, secret: acc.secret });
      origRequests.push(exchange.sign("balance", "fapiPrivateV3", "GET", { ...signParams }));
    }
    return makeHashComparisonParams(origRequests, verifyType);
  }

  /// doc: https://developers.binance.com/docs/derivatives/portfolio-margin/account
  /// api: https://papi.binance.com/papi/v1/balance
  public getPortfolioMarginAccountBalanceRequests(accounts: GeneralAccount[], verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParams {
    const signParams = { recvWindow: this.recvWindow };
    const origRequests: any[] = [];
    for (const acc of accounts) {
      const exchange = new ccxt.binance({ apiKey: acc.key, secret: acc.secret });
      origRequests.push(exchange.sign("um/positionRisk", "papi", "GET", signParams));
      origRequests.push(exchange.sign("balance", "papi", "GET", { ...signParams }));
    }
    return makeHashComparisonParams(origRequests, verifyType);
  }
}
