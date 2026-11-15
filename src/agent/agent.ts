import Anthropic from "@anthropic-ai/sdk";
import { PolicyEngine, type TransactionIntent } from "../policy/engine.js";
import { sendQor, getBalance } from "../signing/client.js";
import { deriveFromMnemonic, type WalletKeys } from "../keys/generate.js";

export interface AgentDecision {
  intent: TransactionIntent | null;
  policyLog: string[];
  action: string;
  result: string;
  timestamp: string;
}

const SYSTEM_PROMPT = `You are AfterKey, a post-quantum wallet assistant on QoreChain.

Your job: parse the user's request into a transaction intent OR answer their question.

If the user wants to send/transfer tokens, respond with EXACTLY this JSON (no markdown, no backticks):
{"action":"send","to":"<address>","amount":<number>,"denom":"uqor"}

If they want to check their balance, respond with:
{"action":"balance"}

If they're asking a question or anything else, respond naturally in plain text.

Rules:
- Amounts are in QOR (not uqor). 1 QOR = 1,000,000 uqor.
- Addresses start with qor1
- If the user says "send 5 qor to alice" and you don't know alice's address, ask for it.
- Never make up addresses.`;

export class WalletAgent {
  private client: Anthropic;
  private policy: PolicyEngine;
  private keys: WalletKeys | null = null;
  private reasoningLog: AgentDecision[] = [];

  constructor(policy?: PolicyEngine) {
    this.client = new Anthropic();
    this.policy = policy ?? new PolicyEngine();
  }

  async loadKeys(mnemonic: string) {
    this.keys = await deriveFromMnemonic(mnemonic);
  }

  async process(userInput: string): Promise<AgentDecision> {
    const decision: AgentDecision = {
      intent: null,
      policyLog: [],
      action: "",
      result: "",
      timestamp: new Date().toISOString(),
    };

    decision.policyLog.push(`[input] User said: "${userInput}"`);

    const response = await this.client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userInput }],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    const aiResponse = textBlock?.text ?? "";
    decision.policyLog.push(`[ai] Parsed response: ${aiResponse}`);

    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      decision.action = "chat";
      decision.result = aiResponse;
      decision.policyLog.push("[decision] Not a transaction request. Responding with chat.");
      this.reasoningLog.push(decision);
      return decision;
    }

    if (parsed.action === "balance") {
      decision.action = "balance";
      if (!this.keys) {
        decision.result = "No wallet loaded.";
        decision.policyLog.push("[error] No wallet keys loaded.");
      } else {
        const balances = await getBalance(this.keys.address);
        decision.result = JSON.stringify(balances, null, 2);
        decision.policyLog.push(`[balance] Fetched balances for ${this.keys.address}`);
      }
      this.reasoningLog.push(decision);
      return decision;
    }

    if (parsed.action === "send") {
      const intent: TransactionIntent = {
        action: "send",
        to: parsed.to,
        amount: parsed.amount,
        denom: parsed.denom || "uqor",
      };
      decision.intent = intent;
      decision.action = "send";

      const { result: policyResult, log } = this.policy.evaluateWithLog(intent);
      decision.policyLog.push(...log);

      if (!policyResult.allowed) {
        decision.result = `BLOCKED: ${policyResult.reason}`;
        decision.policyLog.push(`[decision] Transaction denied by policy: ${policyResult.reason}`);
        this.reasoningLog.push(decision);
        return decision;
      }

      decision.policyLog.push("[decision] All policy checks passed. Proceeding with hybrid signing.");

      if (!this.keys) {
        decision.result = "No wallet loaded. Cannot sign.";
        decision.policyLog.push("[error] No wallet keys loaded.");
        this.reasoningLog.push(decision);
        return decision;
      }

      try {
        const txResult = await sendQor(this.keys, intent.to, String(intent.amount));
        decision.result = `Sent ${intent.amount} QOR to ${intent.to}. TX: ${txResult.transactionHash}`;
        decision.policyLog.push(`[tx] Hybrid-signed and broadcast. Hash: ${txResult.transactionHash}`);
      } catch (err: any) {
        decision.result = `Transaction failed: ${err.message}`;
        decision.policyLog.push(`[error] Transaction failed: ${err.message}`);
      }

      this.reasoningLog.push(decision);
      return decision;
    }

    decision.action = "unknown";
    decision.result = aiResponse;
    this.reasoningLog.push(decision);
    return decision;
  }

  getReasoningLog(): AgentDecision[] {
    return this.reasoningLog;
  }

  getFormattedLog(): string {
    return this.reasoningLog
      .map((d, i) => {
        const lines = [
          `--- Decision ${i + 1} [${d.timestamp}] ---`,
          `Action: ${d.action}`,
          d.intent ? `Intent: ${JSON.stringify(d.intent)}` : null,
          `Result: ${d.result}`,
          `Reasoning:`,
          ...d.policyLog.map((l) => `  ${l}`),
        ];
        return lines.filter(Boolean).join("\n");
      })
      .join("\n\n");
  }
}
