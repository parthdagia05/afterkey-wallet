/**
 * Send a hybrid-signed transaction during the Q-Day Drill.
 * This proves the account still works under PQ protection.
 */
import { deriveFromMnemonic } from "../keys/generate.js";
import { sendQor } from "../signing/client.js";
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

  console.log("=== Q-Day Drill Transaction ===\n");
  console.log("Sending 0.1 QOR from drill account to itself (self-transfer)...");
  console.log("From/To:", keys.address, "\n");

  const result = await sendQor(keys, keys.address, "0.1");

  console.log("\n=== SUCCESS ===");
  console.log("TX Hash:", result.transactionHash);
  console.log("\nSubmit this hash on your project page at build.qorechain.io by 19 Nov!");
}

main().catch(console.error);
