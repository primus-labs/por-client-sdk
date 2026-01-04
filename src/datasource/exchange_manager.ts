import { ExchangesConfig } from "../config_schema.js";
import { Binance } from "./binance.js";
import { Aster } from "./aster.js";


/**
 * 
 * Usage:
 * const manager = new ExchangeManager(exchange_config);
 * manager.aster?.hasSpot;                      // boolean
 * manager.binance?.usdSFuturesAccounts;        // BinanceAccount[]
 */
export class ExchangeManager {
  public readonly binance?: Binance;
  public readonly aster?: Aster;

  constructor(config: ExchangesConfig) {
    if (config.binance) this.binance = new Binance(config.binance);
    if (config.aster) this.aster = new Aster(config.aster);
  }
}
