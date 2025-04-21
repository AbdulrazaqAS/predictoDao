const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {expect, assert} = require("chai");

describe("Predicto Token", () => {
    async function deployTokenFixture(){
        const signers = await ethers.getSigners();
        const admins = signers.slice(0, 5);
        const amountPerAdmin = 200;

        const PredictoToken = await ethers.getContractFactory("PredictoToken");
        const predictoToken = await PredictoToken.deploy(admins, amountPerAdmin);
        await predictoToken.waitForDeployment();
        return {admins, signers, amountPerAdmin, predictoToken}
    }

    it("Should deploy token", async () => {
        const {predictoToken} = await loadFixture(deployTokenFixture);
        const provider = ethers.provider;
        const address = predictoToken.target;
        assert(await provider.getCode(address) !== "0x0")
    });
    
    it("Should assign DEFAULT_ADMIN_ROLE to admins", async () => {
        const {predictoToken, admins} = await loadFixture(deployTokenFixture);
        const MINTER_ROLE = await predictoToken.MINTER_ROLE();
        const DEFAULT_ADMIN_ROLE = await predictoToken.DEFAULT_ADMIN_ROLE();

        for (const admin of admins){
            const hasRole = await predictoToken.hasRole(DEFAULT_ADMIN_ROLE, admin);
            assert(hasRole, `Role not assigned to ${admin.address}`)
        }
    });

    it("Should mint tokens to admins", async () => {
        const {predictoToken, admins, amountPerAdmin} = await loadFixture(deployTokenFixture);
        const amountPerAdminInWei = ethers.parseUnits(amountPerAdmin.toString(), await predictoToken.decimals());

        for (const admin of admins){
            const amount = await predictoToken.balanceOf(admin.address);
            assert(amount === amountPerAdminInWei, `Tokens not minted to ${admin.address}`)
        }
    });

    it("Should check admins can call mint", async () => {
        const {predictoToken, admins, signers} = await loadFixture(deployTokenFixture);
        const amount = ethers.parseUnits("10", await predictoToken.decimals());

        for (const admin of admins){
            await expect(predictoToken.connect(admin).mint(signers[5], amount))
                .to.changeTokenBalances(predictoToken, [admin, signers[5]], [-amount, amount])
        }
    });
});