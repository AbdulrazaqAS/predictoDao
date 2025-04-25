const path = require("path");

async function setFunctionRole(manager, target, targetFunc, role){
  const funcId = ethers.id(targetFunc).slice(0, 10);  // Ox + 4 bytes or Ox + 8 hex chars
  // console.log(targetFunc, "id:", funcId);
  await manager.setTargetFunctionRole(target, [funcId], role);
}

async function grantRole(manager, role, addr, delay=0){
  await manager.grantRole(role, addr, delay);
}

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
  const contractsData = {};

  console.log("Deployer:", deployerAddress);
  const deployerBal = await deployer.provider.getBalance(deployerAddress);
  console.log("Deployer balance:", ethers.formatEther(deployerBal), "eth");
  
  const PredictoAccessManager = await ethers.getContractFactory("PredictoAccessManager");
  const predictoAccessManager = await PredictoAccessManager.deploy(deployer);
  await predictoAccessManager.waitForDeployment();
  let txResponse = predictoAccessManager.deploymentTransaction();
  let txReceipt = await txResponse.wait();
  const manager = txReceipt.contractAddress;
  let deploymentBlock = txReceipt?.blockNumber;
  let deploymentnFee = ethers.formatEther(txReceipt?.fee || 0);
  contractsData["PredictoAccessManager"] = {address: manager, block: deploymentBlock, fee: deploymentnFee};
  console.log("\nPredictoAccessManager");
  console.log("Contract address:", manager || "Error getting blocknunber");
  console.log("Deployment block number:", deploymentBlock || "Error getting blocknumber");
  console.log("Deployment fee:", deploymentnFee, "eth");
  
  const PredictoToken = await ethers.getContractFactory("PredictoToken");
  const predictoToken = await PredictoToken.deploy(manager);
  await predictoToken.waitForDeployment();
  txResponse = predictoToken.deploymentTransaction();
  txReceipt = await txResponse.wait();
  const token = txReceipt.contractAddress;
  deploymentBlock = txReceipt?.blockNumber;
  deploymentnFee = ethers.formatEther(txReceipt?.fee || 0);
  contractsData["PredictoToken"] = {address: token, block: deploymentBlock, fee: deploymentnFee};
  console.log("\nPredictoToken");
  console.log("Contract address:", token || "Error getting blocknunber");
  console.log("Deployment block number:", deploymentBlock || "Error getting blocknumber");
  console.log("Deployment fee:", deploymentnFee, "eth");
  
  const QuestionManager = await ethers.getContractFactory("QuestionManager");
  const questionManager = await QuestionManager.deploy(manager);
  await questionManager.waitForDeployment();
  txResponse = questionManager.deploymentTransaction();
  txReceipt = await txResponse.wait();
  const questionManagerAddr = txReceipt.contractAddress;
  deploymentBlock = txReceipt?.blockNumber;
  deploymentnFee = ethers.formatEther(txReceipt?.fee || 0);
  contractsData["QuestionManager"] = {address: questionManagerAddr, block: deploymentBlock, fee: deploymentnFee};
  console.log("\nQuestionManager");
  console.log("Contract address:", questionManagerAddr || "Error getting blocknunber");
  console.log("Deployment block number:", deploymentBlock || "Error getting blocknumber");
  console.log("Deployment fee:", deploymentnFee, "eth");
  
  const UserManager = await ethers.getContractFactory("UserManager");
  const userManager = await UserManager.deploy();
  await userManager.waitForDeployment();
  txResponse = userManager.deploymentTransaction();
  txReceipt = await txResponse.wait();
  const userManagerAddr = txReceipt.contractAddress;
  deploymentBlock = txReceipt?.blockNumber;
  deploymentnFee = ethers.formatEther(txReceipt?.fee || 0);
  contractsData["UserManager"] = {address: userManagerAddr, block: deploymentBlock, fee: deploymentnFee};
  console.log("\nUserManager");
  console.log("Contract address:", userManagerAddr || "Error getting blocknunber");
  console.log("Deployment block number:", deploymentBlock || "Error getting blocknumber");
  console.log("Deployment fee:", deploymentnFee, "eth");

  const signers = await ethers.getSigners();
  const admins = signers.slice(0, 5);
  const requiredValidations = 3;
  const PredictoDao = await ethers.getContractFactory("PredictoDao");
  const predictoDao = await PredictoDao.deploy(admins, requiredValidations, token);
  await predictoDao.waitForDeployment();
  txResponse = predictoDao.deploymentTransaction();
  txReceipt = await txResponse.wait();
  const predictoDaoAddr = txReceipt.contractAddress;
  deploymentBlock = txReceipt?.blockNumber;
  deploymentnFee = ethers.formatEther(txReceipt?.fee || 0);
  contractsData["PredictoDao"] = {address: predictoDaoAddr, block: deploymentBlock, fee: deploymentnFee};
  console.log("\nPredictoDao");
  console.log("Contract address:", predictoDaoAddr || "Error getting blocknunber");
  console.log("Deployment block number:", deploymentBlock || "Error getting blocknumber");
  console.log("Deployment fee:", deploymentnFee, "eth");

  // Save the contract's artifacts and address in the frontend directory
  saveFrontendFiles(contractsData);
}

function saveFrontendFiles(contractsData) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "public");
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contracts-data.json"),
    JSON.stringify(contractsData, undefined, 2)
  );
  
  const contractNames = Object.keys(contractsData);
  for (const contractName of contractNames){
    const contractArtifact = artifacts.readArtifactSync(contractName);
    
    fs.writeFileSync(
      path.join(contractsDir, `${contractName}ABI.json`),
      JSON.stringify(contractArtifact.abi, null, 2)
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
