import { DatasourceConfig } from "../config_schema.js";
import { Binance } from "./binance.js";
import { Aster } from "./aster.js";
import { Grvt } from "./grvt.js";
import { Bybit } from "./bybit.js";
import { Hyperliquid } from "./hyperliquid.js";
import { Pacifica } from "./pacifica.js";
import { Extended } from "./extended.js";


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
  public readonly grvt?: Grvt;
  public readonly bybit?: Bybit;
  public readonly hyperliquid?: Hyperliquid;
  public readonly pacifica?: Pacifica;
  public readonly extended?: Extended;

  constructor(config: DatasourceConfig) {
    if (config.binance) this.binance = new Binance(config.binance);
    if (config.aster) this.aster = new Aster(config.aster);
    if (config.grvt) this.grvt = new Grvt(config.grvt);
    if (config.bybit) this.bybit = new Bybit(config.bybit);
    if (config.hyperliquid) this.hyperliquid = new Hyperliquid(config.hyperliquid);
    if (config.pacifica) this.pacifica = new Pacifica(config.pacifica);
    if (config.extended) this.extended = new Extended(config.extended);
  }
}
