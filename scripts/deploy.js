const path = require("path");

async function main() {
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const contractName = "PredictoDao";
  const admins = [deployer];
  const requiredValidations = 3;

  console.log("Deployer:", deployerAddress);

  const deployerBal = await deployer.provider.getBalance(deployerAddress);
  console.log("Deployer balance:", ethers.formatEther(deployerBal), "eth");

  const PredictoDao = await ethers.getContractFactory(contractName);
  const predictoDao = await PredictoDao.deploy(admins, requiredValidations);
  await predictoDao.waitForDeployment();
  const txResponse = predictoDao.deploymentTransaction();
  const txReceipt = await txResponse.wait();
  const contractAddress = txReceipt.contractAddress;
  console.log("Contract address:", contractAddress || "Error getting blocknunber");
  console.log("Deployment block number:", txReceipt?.blockNumber || "Error getting blocknumber");
  console.log("Deployment fee:", ethers.formatEther(txReceipt?.fee || 0), "eth");

  // Save the contract's artifacts and address in the frontend directory
  saveFrontendFiles(predictoDao, contractName, contractAddress, block);
}

function saveFrontendFiles(contract, contractName, contractAddress, block) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "public");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-data.json"),
    JSON.stringify({ address: contractAddress, deploymentBlock: block }, undefined, 2)
  );

  const contractArtifact = artifacts.readArtifactSync(contractName);

  fs.writeFileSync(
    path.join(contractsDir, `${contractName}.json`),
    JSON.stringify(contractArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
