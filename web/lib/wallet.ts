import {
  createClient,
  deriveNativeAccount,
  derivePqcCanonical,
  directSignerFromPrivateKey,
  toBase,
} from "@qorechain/sdk";
import { secret } from "./secrets";

export const REST = "https://api-testnet.qore.host";
export const RPC = "https://rpc-testnet.qore.host";
export const EXPLORER_TX = "https://scan-testnet.qore.host/tx";

interface Keys {
  address: string;
  privateKey: Uint8Array;
  pqcKeypair: { publicKey: Uint8Array; secretKey: Uint8Array };
}

let cached: Keys | null = null;

async function keys(): Promise<Keys> {
  if (cached) return cached;
  const mnemonic = await secret("MAIN_MNEMONIC");
  if (!mnemonic) throw new Error("MAIN_MNEMONIC not configured");
  const account = await deriveNativeAccount(mnemonic);
  cached = {
    address: account.address,
    privateKey: account.privateKey,
    pqcKeypair: derivePqcCanonical(account.address, mnemonic),
  };
  return cached;
}

export async function walletAddress() {
  return (await keys()).address;
}

export function client() {
  return createClient({ endpoints: { rest: REST, rpc: RPC } });
}

export async function getBalances(address?: string) {
  const addr = address ?? (await walletAddress());
  const res = await client().rest.getAllBalances(addr);
  return ((res as any).balances ?? res) as { denom: string; amount: string }[];
}

export async function sendQor(to: string, amountQor: number) {
  const k = await keys();
  const signer = await directSignerFromPrivateKey(k.privateKey, "qor");
  const tx = await client().connectTx(signer, { pqcKeypair: k.pqcKeypair });
  const result = await tx.bankSend(to, [{ denom: "uqor", amount: toBase(String(amountQor)) }]);
  return { hash: result.transactionHash as string, height: (result as any).height as number | undefined };
}

export function isQorAddress(s: string) {
  return /^qor1[02-9ac-hj-np-z]{38}$/.test(s);
}
