import { deriveFromMnemonic } from "../keys/generate.js";
import { sendQor, getBalance } from "../signing/client.js";
import { evmToQor } from "@qorechain/sdk";
import * as dotenv from "dotenv";

dotenv.config();

const EVM_ADDRESS = "0xFecE325E82458365a56D257bDac0CBc596Bc010a";

async function main() {
  const mnemonic = process.env.MAIN_MNEMONIC;
  if (!mnemonic) {
    console.error("Set MAIN_MNEMONIC in .env");
    process.exit(1);
  }

  // Convert EVM address to qor1 address
  const qorAddress = evmToQor(EVM_ADDRESS);
  console.log("EVM address:", EVM_ADDRESS);
  console.log("QOR address:", qorAddress);

  const keys = await deriveFromMnemonic(mnemonic);
  console.log("Sending 2 QOR from main account to drill EVM address...");
  const result = await sendQor(keys, qorAddress, "2");

  console.log("\nChecking EVM balance...");
  const balances = await getBalance(qorAddress);
  console.log("Balances:", JSON.stringify(balances, null, 2));
}

main().catch(console.error);
