const hre = require("hardhat");

async function main() {
  console.log("Deploying ContractNFT...");

  // Deploy contract
  const ContractNFT = await hre.ethers.getContractFactory("ContractNFT");
  const contract = await ContractNFT.deploy();
  await contract.deployed();

  const address = contract.address;
  console.log(`ContractNFT deployed to: ${address}`);

  // Store address for future reference
  console.log("\nAdd this to your .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_NFT_TESTNET=${address}`);
  console.log(`NEXT_PUBLIC_CONTRACT_NFT_MAINNET=${address}`);

  // Optional: Verify on etherscan
  console.log("\nVerify contract with:");
  console.log(`npx hardhat verify --network baseSepolia ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
