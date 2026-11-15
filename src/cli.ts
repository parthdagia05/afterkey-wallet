import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { WalletAgent } from "./agent/agent.js";
import { PolicyEngine } from "./policy/engine.js";
import "dotenv/config";

async function main() {
  console.log("=== AfterKey Wallet ===");
  console.log("a quantum-safe wallet that thinks before it signs\n");

  const mnemonic = process.env.MAIN_MNEMONIC;
  if (!mnemonic) {
    console.error("Set MAIN_MNEMONIC in .env");
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Set ANTHROPIC_API_KEY in .env");
    process.exit(1);
  }

  const policy = new PolicyEngine({
    maxAmountPerTx: 50,
    dailyLimit: 200,
    allowList: [],
    cooldownMinutes: 0,
  });

  const agent = new WalletAgent(policy);
  await agent.loadKeys(mnemonic);
  console.log("Wallet loaded. Type your request in plain English.");
  console.log("Examples: 'check my balance', 'send 1 qor to qor1abc...'");
  console.log("Type 'log' to see reasoning log, 'quit' to exit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("you > ", async (input) => {
      const trimmed = input.trim();
      if (!trimmed) { prompt(); return; }

      if (trimmed === "quit" || trimmed === "exit") {
        const logPath = path.join(process.cwd(), "reasoning-log.txt");
        fs.writeFileSync(logPath, agent.getFormattedLog());
        console.log(`\nReasoning log saved to ${logPath}`);
        rl.close();
        return;
      }

      if (trimmed === "log") {
        console.log("\n" + agent.getFormattedLog() + "\n");
        prompt();
        return;
      }

      try {
        const decision = await agent.process(trimmed);
        console.log(`\nafterkey > ${decision.result}`);
        if (decision.policyLog.length > 0) {
          console.log("\n  reasoning:");
          decision.policyLog.forEach((l) => console.log(`    ${l}`));
        }
        console.log("");
      } catch (err: any) {
        console.error(`\nerror: ${err.message}\n`);
      }

      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
