import { Exchanges, BinanceKind, AsterKind, BinanceAccount, AsterAccount, ExchangesConfig } from "./config_schema.js";

type Kind = BinanceKind | AsterKind;
export type GeneralAccount = BinanceAccount | AsterAccount;




export function getAccounts(
  exchangesConfig: ExchangesConfig,
  exchange: Exchanges,
  kind?: Kind
): GeneralAccount[] {
  const accounts = exchangesConfig[exchange] ?? [];

  const enabledAccounts = accounts.filter((acc) => acc.enabled ?? true);

  if (kind) {
    return enabledAccounts.filter((acc) => acc.kind.includes(kind));
  }

  return enabledAccounts;
}
