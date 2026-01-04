export abstract class BaseExchange<
  T extends { kind: readonly K[]; enabled?: boolean },
  K extends string,
> {
  protected readonly accounts: readonly T[];
  protected readonly recvWindow: number = 60 * 1000;

  constructor(accounts?: readonly T[]) {
    this.accounts = (accounts ?? []).filter(acc => acc.enabled ?? true); // only enabled account
  }

  protected getAccounts(kind?: K): T[] {
    if (!kind) return [...this.accounts];
    return this.accounts.filter(acc => acc.kind.includes(kind));
  }
}