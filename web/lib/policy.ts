import { getContacts, getHistory, sentToday, type PolicyCheck } from "./store";

export const POLICY = {
  maxPerTx: 50,
  dailyLimit: 200,
  cooldownSeconds: 0,
  allowListOnly: false,
  velocityWindowMinutes: 5,
  velocityMaxSends: 3,
  anomalyMultiplier: 3,
};

export async function dailySpent() {
  return (await sentToday()).reduce((s, h) => s + (h.amount ?? 0), 0);
}

export async function evaluate(to: string, amount: number): Promise<{ allowed: boolean; checks: PolicyCheck[] }> {
  const checks: PolicyCheck[] = [];
  const [spent, history, contacts] = await Promise.all([dailySpent(), getHistory(), getContacts()]);
  const sends = history.filter((h) => h.status === "sent" && h.amount);

  checks.push({
    rule: "max-per-tx",
    severity: "block",
    passed: amount <= POLICY.maxPerTx,
    detail: amount <= POLICY.maxPerTx
      ? `${amount} QOR within ${POLICY.maxPerTx} QOR per-tx limit`
      : `${amount} QOR exceeds ${POLICY.maxPerTx} QOR per-tx limit`,
  });

  checks.push({
    rule: "daily-limit",
    severity: "block",
    passed: spent + amount <= POLICY.dailyLimit,
    detail: spent + amount <= POLICY.dailyLimit
      ? `${spent} spent today + ${amount} within ${POLICY.dailyLimit} QOR daily limit`
      : `${spent} spent today + ${amount} exceeds ${POLICY.dailyLimit} QOR daily limit`,
  });

  const known = contacts.some((c) => c.address === to);
  if (POLICY.allowListOnly) {
    checks.push({
      rule: "allow-list",
      severity: "block",
      passed: known,
      detail: known ? "Recipient is a saved contact" : "Recipient not in allowlist (contacts)",
    });
  } else {
    checks.push({
      rule: "allow-list",
      severity: "info",
      passed: true,
      detail: known ? "Recipient is a saved contact" : "Allowlist off — any address permitted",
    });
  }

  const last = sends[0];
  if (POLICY.cooldownSeconds > 0 && last) {
    const elapsed = (Date.now() - new Date(last.timestamp).getTime()) / 1000;
    checks.push({
      rule: "cooldown",
      severity: "block",
      passed: elapsed >= POLICY.cooldownSeconds,
      detail: `${Math.round(elapsed)}s since last send (cooldown ${POLICY.cooldownSeconds}s)`,
    });
  } else {
    checks.push({ rule: "cooldown", severity: "info", passed: true, detail: "No cooldown configured" });
  }

  const windowStart = Date.now() - POLICY.velocityWindowMinutes * 60_000;
  const recent = sends.filter((h) => new Date(h.timestamp).getTime() > windowStart).length;
  checks.push({
    rule: "velocity",
    severity: "block",
    passed: recent < POLICY.velocityMaxSends,
    detail: recent < POLICY.velocityMaxSends
      ? `${recent} send${recent === 1 ? "" : "s"} in last ${POLICY.velocityWindowMinutes}m (limit ${POLICY.velocityMaxSends})`
      : `${recent} sends in last ${POLICY.velocityWindowMinutes}m — rapid-fire pattern blocked`,
  });

  if (sends.length >= 3) {
    const sample = sends.slice(0, 20);
    const avg = sample.reduce((s, h) => s + (h.amount ?? 0), 0) / sample.length;
    const anomalous = amount > avg * POLICY.anomalyMultiplier;
    checks.push({
      rule: "anomaly",
      severity: "warn",
      passed: !anomalous,
      detail: anomalous
        ? `${amount} QOR is ${(amount / avg).toFixed(1)}x your average send (${avg.toFixed(2)} QOR)`
        : `${amount} QOR is in line with your average send (${avg.toFixed(2)} QOR)`,
    });
  } else {
    checks.push({ rule: "anomaly", severity: "info", passed: true, detail: "Not enough history for anomaly baseline yet" });
  }

  const seenBefore = sends.some((h) => h.to === to);
  checks.push({
    rule: "new-recipient",
    severity: "warn",
    passed: seenBefore || known,
    detail: seenBefore || known ? "Recipient seen before" : "First time sending to this address — double check it",
  });

  const allowed = checks.every((c) => c.passed || c.severity !== "block");
  return { allowed, checks };
}
