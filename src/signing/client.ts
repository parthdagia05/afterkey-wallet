import {
  createClient,
  directSignerFromPrivateKey,
  ensurePqcRegistered,
  toBase,
} from "@qorechain/sdk";
import type { WalletKeys } from "../keys/generate.js";

const TESTNET_REST = "https://api-testnet.qore.host";
const TESTNET_RPC = "https://rpc-testnet.qore.host";

export function getClient() {
  return createClient({
    endpoints: { rest: TESTNET_REST, rpc: TESTNET_RPC },
  });
}

export async function createHybridTxClient(keys: WalletKeys) {
  const client = getClient();
  const signer = await directSignerFromPrivateKey(keys.privateKey, "qor");
  const tx = await client.connectTx(signer, { pqcKeypair: keys.pqcKeypair });
  return { client, tx };
}

export async function registerPqcKey(keys: WalletKeys) {
  const { client, tx } = await createHybridTxClient(keys);
  const result = await ensurePqcRegistered(tx, {
    pqcKeypair: keys.pqcKeypair,
    rest: TESTNET_REST,
    fee: { amount: [{ denom: "uqor", amount: "90000" }], gas: "600000" },
  });

  if (result.alreadyRegistered) {
    console.log("PQC key already registered for", keys.address);
  } else {
    console.log("PQC key registered! TX:", result.txHash);
  }
  return result;
}

export async function sendQor(keys: WalletKeys, to: string, amountQor: string) {
  const { tx } = await createHybridTxClient(keys);
  const result = await tx.bankSend(to, [
    { denom: "uqor", amount: toBase(amountQor) },
  ]);
  console.log("Sent", amountQor, "QOR to", to);
  console.log("TX hash:", result.transactionHash);
  return result;
}

export async function getBalance(address: string) {
  const client = getClient();
  const balances = await client.rest.getAllBalances(address);
  return balances;
}
