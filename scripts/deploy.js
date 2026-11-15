const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying PQVault to QoreChain testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "QOR\n");

  const PQVault = await ethers.getContractFactory("PQVault");
  const vault = await PQVault.deploy();
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("PQVault deployed to:", address);
  console.log("\nAdd this address to your drill registration on build.qorechain.io");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
