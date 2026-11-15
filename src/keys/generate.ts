import {
  generateMnemonic,
  deriveNativeAccount,
  derivePqcCanonical,
} from "@qorechain/sdk";

export interface WalletKeys {
  mnemonic: string;
  address: string;
  privateKey: Uint8Array;
  pqcKeypair: { publicKey: Uint8Array; secretKey: Uint8Array };
}

export async function generateWalletKeys(): Promise<WalletKeys> {
  const mnemonic = generateMnemonic();
  return deriveFromMnemonic(mnemonic);
}

export async function deriveFromMnemonic(mnemonic: string): Promise<WalletKeys> {
  const account = await deriveNativeAccount(mnemonic);
  const pqcKeypair = derivePqcCanonical(account.address, mnemonic);

  return {
    mnemonic,
    address: account.address,
    privateKey: account.privateKey,
    pqcKeypair,
  };
}
