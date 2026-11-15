/**
 * Q-Day Drill Setup Script
 *
 * Creates a fresh drill account, registers its PQ key, and prints
 * the classical private key needed for drill registration.
 */
import { generateWalletKeys } from "../keys/generate.js";
import { registerPqcKey, getBalance } from "../signing/client.js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=== Q-Day Drill Account Setup ===\n");

  // Step 1: Generate fresh keys
  console.log("1. Generating fresh drill account...");
  const keys = await generateWalletKeys();
  console.log("   Address:", keys.address);
  console.log("   Mnemonic:", keys.mnemonic);
  console.log("");

  // Save mnemonic securely (local only, gitignored)
  const secretsDir = path.join(process.cwd(), ".secrets");
  if (!fs.existsSync(secretsDir)) fs.mkdirSync(secretsDir, { mode: 0o700 });
  fs.writeFileSync(
    path.join(secretsDir, "drill-mnemonic.txt"),
    keys.mnemonic,
    { mode: 0o600 }
  );
  console.log("   Mnemonic saved to .secrets/drill-mnemonic.txt");

  // Step 2: Print the classical private key (hex) for drill registration
  const classicalKeyHex = Buffer.from(keys.privateKey).toString("hex");
  fs.writeFileSync(
    path.join(secretsDir, "drill-classical-key.txt"),
    classicalKeyHex,
    { mode: 0o600 }
  );
  console.log("   Classical private key saved to .secrets/drill-classical-key.txt");
  console.log("");

  // Step 3: Instructions
  console.log("2. NEXT STEPS:");
  console.log("   a) Fund this address from the faucet at dashboard.qorechain.io/faucet:");
  console.log("      ", keys.address);
  console.log("   b) After funding, run: npx tsx src/scripts/register-pqc.ts");
  console.log("   c) Then register for the drill on build.qorechain.io with:");
  console.log("      - Account address:", keys.address);
  console.log("      - Classical private key: (in .secrets/drill-classical-key.txt)");
  console.log("");
  console.log("⚠️  DEADLINE: Register before 17 Nov 23:59 UTC!");
}

main().catch(console.error);
