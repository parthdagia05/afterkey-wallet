import {
  createClient,
  directSignerFromPrivateKey,
  openEvmWindowMsg,
  derivePqcCanonical,
  deriveNativeAccount,
} from "@qorechain/sdk";
import * as fs from "fs";
import * as path from "path";

const TESTNET_REST = "https://api-testnet.qore.host";
const TESTNET_RPC = "https://rpc-testnet.qore.host";

async function main() {
  const mnemonicPath = path.join(process.cwd(), ".secrets", "drill-mnemonic.txt");
  if (!fs.existsSync(mnemonicPath)) {
    console.error("No drill mnemonic found. Run setup-drill.ts first.");
    process.exit(1);
  }

  const mnemonic = fs.readFileSync(mnemonicPath, "utf-8").trim();
  const account = await deriveNativeAccount(mnemonic);
  const pqcKeypair = derivePqcCanonical(account.address, mnemonic);
  const signer = await directSignerFromPrivateKey(account.privateKey, "qor");

  const client = createClient({
    endpoints: { rest: TESTNET_REST, rpc: TESTNET_RPC },
  });

  const tx = await client.connectTx(signer, { pqcKeypair });

  console.log("=== Open EVM Window ===\n");
  console.log("Account:", account.address);

  const msg = openEvmWindowMsg({
    sender: account.address,
    blocks: 17280,
    maxTxs: 100,
    maxValue: "5000000",
  });

  console.log("Opening EVM window (17280 blocks, 100 txs, 5 QOR max)...");
  const result = await tx.signAndBroadcast([msg], "auto");
  console.log("TX hash:", result.transactionHash);
  console.log("\nEVM window is now open. You can deploy contracts.");
}

main().catch(console.error);
