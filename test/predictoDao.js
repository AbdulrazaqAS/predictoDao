const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect, assert } = require("chai");

describe("Predicto", () => {
    const MINTER = 1n;

    async function deployManagerFixture() {
        const [initialAdmin] = await ethers.getSigners();

        const PredictoAccessManager = await ethers.getContractFactory("PredictoAccessManager");
        const predictoAccessManager = await PredictoAccessManager.deploy(initialAdmin);
        await predictoAccessManager.waitForDeployment();
        const managerAddr = predictoAccessManager.target;

        return { initialAdmin, manager: predictoAccessManager, managerAddr }
    }

    async function deployTokenFixture() {
        const { initialAdmin, manager, managerAddr } = await loadFixture(deployManagerFixture);
        const signers = await ethers.getSigners();

        const PredictoToken = await ethers.getContractFactory("PredictoToken");
        const predictoToken = await PredictoToken.deploy(managerAddr);
        await predictoToken.waitForDeployment();
        const tokenAddr = predictoToken.target;

        return { initialAdmin, manager, managerAddr, token: predictoToken, tokenAddr }
    }

    async function setFunctionRole(manager, target, targetFunc, role){
        const funcId = ethers.id(targetFunc).slice(0, 10);  // Ox + 4 bytes or Ox + 8 hex chars
        // console.log(targetFunc, "id:", funcId);
        await manager.setTargetFunctionRole(target, [funcId], role);
    }

    async function grantRole(manager, role, addr, delay=0){
        await manager.grantRole(role, addr, delay);
    }

    describe("PredictoToken", async () => {
        it("Should have correct name and symbol", async function () {
            const { token } = await loadFixture(deployTokenFixture);
            expect(await token.name()).to.equal("Predicto");
            expect(await token.symbol()).to.equal("PRD");
        });

        it("Should mint tokens if caller is initialAdmin", async function () {
            const { token, initialAdmin } = await loadFixture(deployTokenFixture);
            const [, signer1] = await ethers.getSigners();
            await token.connect(initialAdmin).mint(signer1.address, 1000);
            expect(await token.balanceOf(signer1.address)).to.equal(1000);
        });
        
        it("Should grant roles to addresses", async function () {
            const { token, manager } = await loadFixture(deployTokenFixture);
            const [, signer1] = await ethers.getSigners();
            
            await setFunctionRole(manager, target = token, targetFunc = "mint(address,uint256)", role = MINTER);
            await grantRole(manager, role = MINTER, addr = signer1.address);
            const hasRole = await manager.hasRole(MINTER, signer1.address);
            assert(hasRole, "Minter role not assigned");
        });

        // TODO: Test permit concept
        
        it("Should mint tokens if caller is authorized", async function () {
            const { token, manager } = await loadFixture(deployTokenFixture);
            const [, signer1] = await ethers.getSigners();
            await setFunctionRole(manager, target = token, targetFunc = "mint(address,uint256)", role = MINTER);
            await grantRole(manager, role = MINTER, addr = signer1.address);
            
            await token.connect(signer1).mint(signer1.address, 1000);
            expect(await token.balanceOf(signer1.address)).to.equal(1000);
        });

        it("Should revert mint if caller is unauthorized", async function () {
            const { token } = await loadFixture(deployTokenFixture);
            const [, signer1] = await ethers.getSigners();
            await expect(token.connect(signer1).mint(signer1.address, 1000))
                .to.be.revertedWithCustomError(token, "AccessManagedUnauthorized");
        });

        it("Should not revert if caller is set to delay and has delayed", async function () {
            const { token, manager } = await loadFixture(deployTokenFixture);
            const [, signer1] = await ethers.getSigners();
            const delay = 60;
            await setFunctionRole(manager, target = token, targetFunc = "mint(address,uint256)", role = MINTER);
            await grantRole(manager, role = MINTER, addr = signer1.address, delay);
            
            const data = token.interface.encodeFunctionData("mint", [signer1.address, 1000]);

            await manager.connect(signer1).schedule(token, data, 0);
            await time.increase(delay);
            await token.connect(signer1).mint(signer1.address, 1000);

            expect(await token.balanceOf(signer1.address)).to.equal(1000);
        });

        it("Should revert minting if caller has not delayed", async function () {
            const { token, manager } = await loadFixture(deployTokenFixture);
            const [, signer1] = await ethers.getSigners();
            await setFunctionRole(manager, target = token, targetFunc = "mint(address,uint256)", role = MINTER);
            await grantRole(manager, role = MINTER, addr = signer1.address, delay=60);
            
            await expect(token.connect(signer1).mint(signer1.address, 1000))
                .to.be.revertedWithCustomError(manager, "AccessManagerNotScheduled");
        });
    });

    describe("QuestionManager", () => {
        
    });
});