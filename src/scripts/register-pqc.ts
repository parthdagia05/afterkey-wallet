/**
 * Register PQC key for the drill account.
 * Run after funding the drill account from the faucet.
 */
import { deriveFromMnemonic } from "../keys/generate.js";
import { registerPqcKey, getBalance } from "../signing/client.js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const mnemonicPath = path.join(process.cwd(), ".secrets", "drill-mnemonic.txt");
  if (!fs.existsSync(mnemonicPath)) {
    console.error("No drill mnemonic found. Run setup-drill.ts first.");
    process.exit(1);
  }

  const mnemonic = fs.readFileSync(mnemonicPath, "utf-8").trim();
  const keys = await deriveFromMnemonic(mnemonic);

  console.log("=== Register PQC Key ===\n");
  console.log("Address:", keys.address);

  // Check balance
  const balances = await getBalance(keys.address);
  console.log("Balances:", JSON.stringify(balances, null, 2));

  const balanceList = (balances as any).balances ?? balances;
  const uqorBalance = balanceList.find(
    (b: any) => b.denom === "uqor"
  );
  const qorAmount = uqorBalance
    ? parseInt(uqorBalance.amount) / 1_000_000
    : 0;

  if (qorAmount < 1) {
    console.error(
      "\nInsufficient balance (" + qorAmount + " QOR).",
      "Fund from faucet first: dashboard.qorechain.io/faucet"
    );
    process.exit(1);
  }

  console.log("Balance:", qorAmount, "QOR — sufficient for registration\n");

  // Register
  console.log("Registering PQC key...");
  const result = await registerPqcKey(keys);
  console.log("\nDone!", result.alreadyRegistered ? "(was already registered)" : "");
}

main().catch(console.error);
