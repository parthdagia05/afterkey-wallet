import { deriveFromMnemonic } from "../keys/generate.js";
import { sendQor, getBalance } from "../signing/client.js";
import * as dotenv from "dotenv";

dotenv.config();

const DRILL_ADDRESS = "qor1c5j23knmdd2rzp6h7ksf8gql6kvgtqj820zyrq";

async function main() {
  const mnemonic = process.env.MAIN_MNEMONIC;
  if (!mnemonic) {
    console.error("Set MAIN_MNEMONIC in .env");
    process.exit(1);
  }

  console.log("=== Fund Drill Account ===\n");

  const keys = await deriveFromMnemonic(mnemonic);
  console.log("Main account:", keys.address);

  const balances = await getBalance(keys.address);
  console.log("Main balances:", JSON.stringify(balances, null, 2));

  console.log("\nSending 5 QOR to drill account:", DRILL_ADDRESS);
  const result = await sendQor(keys, DRILL_ADDRESS, "5");

  console.log("\nChecking drill account balance...");
  const drillBalances = await getBalance(DRILL_ADDRESS);
  console.log("Drill balances:", JSON.stringify(drillBalances, null, 2));
}

main().catch(console.error);
