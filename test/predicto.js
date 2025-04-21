const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {expect, assert} = require("chai");

describe("Predicto Token", () => {
    async function deployTokenFixture(){
        const signers = await ethers.getSigners();
        const admins = signers.slice(0, 5);
        const amountPerAdmin = 200;

        const Predicto = await ethers.getContractFactory("Predicto");
        const predicto = await Predicto.deploy(admins, amountPerAdmin);
        await predicto.waitForDeployment();
        return {admins, signers, amountPerAdmin, predicto}
    }

    it("Should deploy token", async () => {
        const {predicto} = await loadFixture(deployTokenFixture);
        const provider = ethers.provider;
        const address = predicto.target;
        assert(await provider.getCode(address) !== "0x0")
    });
    
    it("Should assign DEFAULT_ADMIN_ROLE to admins", async () => {
        const {predicto, admins} = await loadFixture(deployTokenFixture);
        const MINTER_ROLE = await predicto.MINTER_ROLE();
        const DEFAULT_ADMIN_ROLE = await predicto.DEFAULT_ADMIN_ROLE();

        for (const admin of admins){
            const hasRole = await predicto.hasRole(DEFAULT_ADMIN_ROLE, admin);
            assert(hasRole, `Role not assigned to ${admin.address}`)
        }
    });

    it("Should mint tokens to admins", async () => {
        const {predicto, admins, amountPerAdmin} = await loadFixture(deployTokenFixture);
        const amountPerAdminInWei = ethers.parseUnits(amountPerAdmin.toString(), await predicto.decimals());

        for (const admin of admins){
            const amount = await predicto.balanceOf(admin.address);
            assert(amount === amountPerAdminInWei, `Tokens not minted to ${admin.address}`)
        }
    });

    it("Should check admins can call mint", async () => {
        const {predicto, admins, signers} = await loadFixture(deployTokenFixture);
        const amount = ethers.parseUnits("10", await predicto.decimals());

        for (const admin of admins){
            await expect(predicto.connect(admin).mint(signers[5], amount))
                .to.changeTokenBalances(predicto, [admin, signers[5]], [-amount, amount])
        }
    });
});