import { getBalances, walletAddress, REST } from "@/lib/wallet";
import { dailySpent, POLICY } from "@/lib/policy";
import { getContacts, getHistory } from "@/lib/store";

export async function GET() {
  try {
    const address = await walletAddress();
    const balances = await getBalances(address);
    const uqor = balances.find((b) => b.denom === "uqor");
    const qorBalance = uqor ? parseInt(uqor.amount) / 1_000_000 : 0;

    let nodeHealthy = false;
    try {
      const r = await fetch(`${REST}/cosmos/base/tendermint/v1beta1/syncing`, { signal: AbortSignal.timeout(3000) });
      nodeHealthy = (await r.json()).syncing === false;
    } catch { nodeHealthy = false; }

    const sends = (await getHistory()).filter((h) => h.kind === "send");

    return Response.json({
      address,
      balances,
      qorBalance,
      network: { name: "QoreChain Diana Testnet", chainId: "qorechain-diana", evmChainId: 9800, healthy: nodeHealthy },
      security: {
        classicalKey: "secp256k1", classicalStatus: "active",
        pqcAlgorithm: "ML-DSA-87", pqcStatus: "registered", hybridRequired: true,
      },
      policy: {
        maxPerTx: POLICY.maxPerTx,
        dailyLimit: POLICY.dailyLimit,
        dailySpent: await dailySpent(),
        cooldownSeconds: POLICY.cooldownSeconds,
        allowListEnabled: POLICY.allowListOnly,
        velocity: `${POLICY.velocityMaxSends} / ${POLICY.velocityWindowMinutes}m`,
        anomalyMultiplier: POLICY.anomalyMultiplier,
        ruleCount: 7,
      },
      activity: {
        contacts: (await getContacts()).length,
        sent: sends.filter((h) => h.status === "sent").length,
        blocked: sends.filter((h) => h.status === "blocked").length,
        pending: sends.filter((h) => h.status === "pending").length,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
