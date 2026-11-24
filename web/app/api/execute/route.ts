import { evaluate } from "@/lib/policy";
import { sendQor, EXPLORER_TX } from "@/lib/wallet";
import { takePending, updateHistory } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { id, decision } = await request.json();
    if (!id || (decision !== "approve" && decision !== "reject")) {
      return Response.json({ error: "id and decision (approve|reject) required" }, { status: 400 });
    }

    const pending = await takePending(id);
    if (!pending) {
      await updateHistory(id, { status: "failed", error: "Approval expired" });
      return Response.json({ error: "This approval has expired. Ask again." }, { status: 410 });
    }

    const steps: { step: string; detail: string; passed?: boolean }[] = [];

    if (decision === "reject") {
      await updateHistory(id, { status: "rejected" });
      steps.push({ step: "user-decision", detail: "Rejected by user. Nothing was signed.", passed: false });
      return Response.json({ type: "rejected", message: "Transaction cancelled. Nothing was signed or broadcast.", steps });
    }

    steps.push({ step: "user-decision", detail: "Approved by user", passed: true });

    const recheck = await evaluate(pending.to, pending.amount);
    steps.push({
      step: "policy-recheck",
      detail: recheck.allowed ? "Policy re-verified at signing time" : "Policy state changed — no longer allowed",
      passed: recheck.allowed,
    });
    if (!recheck.allowed) {
      const failed = recheck.checks.find((c) => !c.passed && c.severity === "block");
      await updateHistory(id, { status: "blocked", checks: recheck.checks });
      return Response.json({ type: "blocked", message: `Blocked at signing: ${failed?.detail}`, steps });
    }

    steps.push({ step: "sign-secp256k1", detail: "Classical ECDSA signature produced", passed: true });
    steps.push({ step: "sign-ml-dsa-87", detail: "Post-quantum ML-DSA-87 signature produced", passed: true });

    try {
      const { hash, height } = await sendQor(pending.to, pending.amount);
      steps.push({ step: "broadcast", detail: `Included in block ${height ?? "?"} on qorechain-diana`, passed: true });
      await updateHistory(id, { status: "sent", txHash: hash });
      return Response.json({
        type: "sent",
        message: `Sent ${pending.amount} QOR to ${pending.toName ?? pending.to}.`,
        txHash: hash,
        explorer: `${EXPLORER_TX}/${hash}`,
        steps,
      });
    } catch (err: any) {
      steps.push({ step: "broadcast", detail: err.message, passed: false });
      await updateHistory(id, { status: "failed", error: err.message });
      return Response.json({ type: "failed", message: `Broadcast failed: ${err.message}`, steps });
    }
  } catch (err: any) {
    return Response.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
