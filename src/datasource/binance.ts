import ccxt from "ccxt";
import { VERIFY_TYPE, RequestParams } from "../types.js";

export interface BinanceAccount {
  key: string;
  secret: string;
}

function makeHashComparisonParams(origRequests: any[]): RequestParams {
  if (!Array.isArray(origRequests)) {
    throw new Error("Invalid input: origRequests must be an array");
  }

  const request_params: RequestParams = {
    verifyType: 'HASH_COMPARISON',
    requests: [],
    responseResolves: [],
  };

  for (let i = 0; i < origRequests.length; i++) {
    const origRequest = origRequests[i];

    request_params.requests.push({
      url: origRequest.url,
      method: "GET",
      header: { ...origRequest.headers },
      body: "",
    });

    request_params.responseResolves.push([
      {
        keyName: `${i}`,
        parseType: "json",
        parsePath: "$",
        op: "SHA256_EX",
      },
    ]);
  }

  return request_params;
}

export class Binance {
  private accounts: BinanceAccount[];
  private readonly recvWindow: number;

  constructor() {
    this.recvWindow = Number(process.env.BINANCE_RECV_WINDOW || 60) * 1000;
    this.accounts = this.loadAccounts();
  }

  private loadAccounts(): BinanceAccount[] {
    const accounts: BinanceAccount[] = [];

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

    if (verifyType == 'HASH_COMPARISON') {
      return makeHashComparisonParams(origRequests);
    }
    else {
      throw Error("not supported verify type");
    }
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

    if (verifyType == 'HASH_COMPARISON') {
      return makeHashComparisonParams(origRequests);
    }
    else {
      throw Error("not supported verify type");
    }
  }

  public getAccounts(): BinanceAccount[] {
    return this.accounts;
  }
}
