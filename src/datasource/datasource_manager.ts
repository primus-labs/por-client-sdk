import { DatasourceConfig } from "../config_schema.js";
import { Binance } from "./binance.js";
import { Aster } from "./aster.js";


/**
 * 
 * Usage:
 * const manager = new DatasourceManager(datasource_config);
 * manager.aster?.hasSpot;                      // boolean
 * manager.binance?.usdSFuturesAccounts;        // BinanceAccount[]
 */
export class DatasourceManager {
  public readonly binance?: Binance;
  public readonly aster?: Aster;

  constructor(config: DatasourceConfig) {
    if (config.binance) this.binance = new Binance(config.binance);
    if (config.aster) this.aster = new Aster(config.aster);
  }
}
