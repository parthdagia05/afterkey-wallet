export interface PolicyRule {
  name: string;
  check: (tx: TransactionIntent) => PolicyResult;
}

export interface TransactionIntent {
  action: "send" | "withdraw";
  to: string;
  amount: number;
  denom: string;
}

export interface PolicyResult {
  allowed: boolean;
  reason: string;
}

export interface PolicyConfig {
  maxAmountPerTx: number;
  dailyLimit: number;
  allowList: string[];
  cooldownMinutes: number;
}

const DEFAULT_CONFIG: PolicyConfig = {
  maxAmountPerTx: 100,
  dailyLimit: 500,
  allowList: [],
  cooldownMinutes: 0,
};

export class PolicyEngine {
  private config: PolicyConfig;
  private dailySpent = 0;
  private lastTxTime = 0;

  constructor(config: Partial<PolicyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  evaluate(intent: TransactionIntent): PolicyResult {
    const results = this.getRules().map((rule) => rule.check(intent));
    const denied = results.find((r) => !r.allowed);
    return denied ?? { allowed: true, reason: "All policy checks passed" };
  }

  evaluateWithLog(intent: TransactionIntent): { result: PolicyResult; log: string[] } {
    const log: string[] = [];
    const rules = this.getRules();

    for (const rule of rules) {
      const result = rule.check(intent);
      log.push(`[${rule.name}] ${result.allowed ? "PASS" : "DENY"}: ${result.reason}`);
      if (!result.allowed) {
        return { result, log };
      }
    }

    this.dailySpent += intent.amount;
    this.lastTxTime = Date.now();

    return {
      result: { allowed: true, reason: "All policy checks passed" },
      log,
    };
  }

  private getRules(): PolicyRule[] {
    return [
      {
        name: "max-per-tx",
        check: (tx) =>
          tx.amount <= this.config.maxAmountPerTx
            ? { allowed: true, reason: `Amount ${tx.amount} within per-tx limit ${this.config.maxAmountPerTx}` }
            : { allowed: false, reason: `Amount ${tx.amount} exceeds per-tx limit ${this.config.maxAmountPerTx}` },
      },
      {
        name: "daily-limit",
        check: (tx) =>
          this.dailySpent + tx.amount <= this.config.dailyLimit
            ? { allowed: true, reason: `Daily spent ${this.dailySpent} + ${tx.amount} within limit ${this.config.dailyLimit}` }
            : { allowed: false, reason: `Daily spent ${this.dailySpent} + ${tx.amount} exceeds limit ${this.config.dailyLimit}` },
      },
      {
        name: "allow-list",
        check: (tx) =>
          this.config.allowList.length === 0 || this.config.allowList.includes(tx.to)
            ? { allowed: true, reason: this.config.allowList.length === 0 ? "No allow-list configured (all addresses permitted)" : `Recipient ${tx.to} is on allow-list` }
            : { allowed: false, reason: `Recipient ${tx.to} is not on allow-list` },
      },
      {
        name: "cooldown",
        check: () => {
          if (this.config.cooldownMinutes === 0) {
            return { allowed: true, reason: "No cooldown configured" };
          }
          const elapsed = (Date.now() - this.lastTxTime) / 60000;
          return elapsed >= this.config.cooldownMinutes
            ? { allowed: true, reason: `${elapsed.toFixed(1)}m since last tx (cooldown: ${this.config.cooldownMinutes}m)` }
            : { allowed: false, reason: `Only ${elapsed.toFixed(1)}m since last tx (cooldown: ${this.config.cooldownMinutes}m)` };
        },
      },
    ];
  }
}
