import { parseIntent } from "@/lib/ai";
import { evaluate, dailySpent, POLICY } from "@/lib/policy";
import { getBalances, isQorAddress, walletAddress } from "@/lib/wallet";
import {
  addHistory, getContacts, getHistory, putPending, resolveContact, saveContact,
} from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const steps: { step: string; detail: string; passed?: boolean; severity?: string }[] = [
      { step: "input", detail: `"${message}"` },
    ];

    const intent = await parseIntent(message);
    steps.push({ step: "ai-parse", detail: JSON.stringify(intent) });

    /* ---- chat ---- */
    if (intent.action === "chat") {
      await addHistory({ id, timestamp, input: message, kind: "chat", status: "answered" });
      return Response.json({ type: "chat", message: intent.reply, steps });
    }

    /* ---- balance ---- */
    if (intent.action === "balance") {
      const address = await walletAddress();
      const balances = await getBalances(address);
      const uqor = balances.find((b) => b.denom === "uqor");
      const qor = uqor ? parseInt(uqor.amount) / 1_000_000 : 0;
      steps.push({ step: "chain-query", detail: `Fetched balances for ${address.slice(0, 12)}…` });
      await addHistory({ id, timestamp, input: message, kind: "balance", status: "answered" });
      return Response.json({
        type: "balance",
        message: `Your balance is ${qor.toFixed(2)} QOR (${await dailySpent()} QOR spent today of ${POLICY.dailyLimit} limit)`,
        balances, steps,
      });
    }

    /* ---- contacts ---- */
    if (intent.action === "add_contact") {
      if (!isQorAddress(intent.address)) {
        return Response.json({ type: "chat", message: `"${intent.address}" is not a valid qor1 address.`, steps });
      }
      await saveContact(intent.name, intent.address);
      steps.push({ step: "contacts", detail: `Saved ${intent.name} → ${intent.address.slice(0, 14)}…` });
      return Response.json({ type: "chat", message: `Saved ${intent.name} as ${intent.address}. You can now say "send 2 qor to ${intent.name}".`, steps });
    }

    if (intent.action === "list_contacts") {
      const list = await getContacts();
      return Response.json({
        type: "chat",
        message: list.length
          ? "Saved contacts:\n" + list.map((c) => `${c.name} — ${c.address}`).join("\n")
          : "No contacts saved yet. Say \"save alice as qor1...\" to add one.",
        steps,
      });
    }

    if (intent.action === "history") {
      const recent = (await getHistory()).filter((h) => h.kind === "send").slice(0, 5);
      return Response.json({
        type: "chat",
        message: recent.length
          ? "Recent transactions:\n" + recent.map((h) => `${h.status.toUpperCase()} · ${h.amount} QOR → ${h.toName ?? h.to?.slice(0, 14) + "…"}${h.txHash ? " · " + h.txHash.slice(0, 10) + "…" : ""}`).join("\n")
          : "No transactions yet.",
        steps,
      });
    }

    /* ---- send ---- */
    if (intent.action === "send") {
      const amount = Number(intent.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return Response.json({ type: "chat", message: "I need a valid positive amount in QOR.", steps });
      }

      let to = String(intent.to ?? "").trim();
      let toName: string | undefined;
      if (!isQorAddress(to)) {
        const c = await resolveContact(to);
        if (!c) {
          steps.push({ step: "resolve", detail: `"${to}" is not a saved contact or valid address`, passed: false });
          return Response.json({ type: "chat", message: `I don't have an address for "${to}". Give me the qor1 address, or save it first: "save ${to} as qor1..."`, steps });
        }
        toName = c.name;
        to = c.address;
        steps.push({ step: "resolve", detail: `Contact ${c.name} → ${c.address.slice(0, 14)}…`, passed: true });
      } else {
        toName = (await resolveContact(to))?.name;
      }

      const { allowed, checks } = await evaluate(to, amount);
      for (const c of checks) steps.push({ step: c.rule, detail: c.detail, passed: c.passed, severity: c.severity });

      if (!allowed) {
        const failed = checks.find((c) => !c.passed && c.severity === "block");
        await addHistory({ id, timestamp, input: message, kind: "send", status: "blocked", to, toName, amount, checks });
        return Response.json({
          type: "blocked",
          message: `Blocked by policy engine: ${failed?.detail}`,
          steps,
          preview: { to, toName, amount },
        });
      }

      await putPending({ id, to, toName, amount, input: message, checks, createdAt: Date.now() });
      await addHistory({ id, timestamp, input: message, kind: "send", status: "pending", to, toName, amount, checks });
      steps.push({ step: "awaiting-approval", detail: "Policy passed. Waiting for you to approve before signing." });

      const warnings = checks.filter((c) => !c.passed && c.severity === "warn");
      return Response.json({
        type: "pending",
        id,
        message: warnings.length
          ? `Policy passed with ${warnings.length} warning${warnings.length > 1 ? "s" : ""}. Review and approve to sign.`
          : "Policy passed. Review and approve to sign with secp256k1 + ML-DSA-87.",
        steps,
        preview: { to, toName, amount, network: "qorechain-diana", fee: "0.005 QOR (est.)" },
      });
    }

    return Response.json({ type: "chat", message: "I'm not sure what to do with that.", steps });
  } catch (err: any) {
    return Response.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
