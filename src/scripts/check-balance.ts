import { getBalance } from "../signing/client.js";

const address = process.argv[2] || "qor16p7wck80xzd0zlxwy0892mzzzj6yvcua4lalg6";

async function main() {
  console.log("Checking balance for:", address);
  const balances = await getBalance(address);
  console.log("Balances:", JSON.stringify(balances, null, 2));
}

main().catch(console.error);
