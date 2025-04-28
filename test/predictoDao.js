const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect, assert } = require("chai");

describe("Predicto", () => {
    const MINTER = 1n;
    const PREDICTER = 2n;
    const QUESTION_MANAGER = 3n;
    const FUNDS_MANAGER = 4n;

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

        const PredictoToken = await ethers.getContractFactory("PredictoToken");
        const predictoToken = await PredictoToken.deploy(managerAddr);
        await predictoToken.waitForDeployment();
        const tokenAddr = predictoToken.target;

        return { initialAdmin, manager, managerAddr, token: predictoToken, tokenAddr }
    }
    
    async function deployQuestionManagerFixture() {
        const { initialAdmin, manager, managerAddr } = await loadFixture(deployManagerFixture);

        const QuestionManager = await ethers.getContractFactory("QuestionManager");
        const questionManager = await QuestionManager.deploy(managerAddr);
        await questionManager.waitForDeployment();
        const questionMngrAddr = questionManager.target;

        return { initialAdmin, manager, managerAddr, questionManager, questionMngrAddr }
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
        it("Should allow initial admin to add a new question", async () => {
            const { questionManager, initialAdmin } = await loadFixture(deployQuestionManagerFixture);
        
            const answers = ["Yes", "No"];
            const imageUrl = "https://example.com/img.png";
        
            await expect(
              questionManager.connect(initialAdmin).newQuestion("Is Solidity fun?", answers, 60 * 60 * 12, imageUrl)
            ).to.emit(questionManager, "NewQuestion");
        
            const ques = await questionManager.getQuestionAnswers(0);
            expect(ques).to.deep.equal(answers);
        });

        it("Should allow a PREDICTER to predict an answer", async () => {
            const { manager, questionManager, initialAdmin } = await loadFixture(deployQuestionManagerFixture);
            const [, signer1] = await ethers.getSigners();

            const answers = ["Up", "Down"];
            await questionManager.connect(initialAdmin).newQuestion("Market direction?", answers, 60 * 60 * 12, "url");
            
            await setFunctionRole(manager, target = questionManager, targetFunc = "predict(uint256,uint8)", role = PREDICTER);
            await grantRole(manager, role = PREDICTER, addr = signer1.address);

            await expect(questionManager.connect(signer1).predict(0, 0))
                .to.emit(questionManager, "QuestionAnswerVoted");
        });
        
        it("Should not allow a non PREDICTER to predict an answer", async () => {
            const { manager, questionManager, initialAdmin } = await loadFixture(deployQuestionManagerFixture);
            const [, signer1] = await ethers.getSigners();

            const answers = ["Up", "Down"];
            await questionManager.connect(initialAdmin).newQuestion("Market direction?", answers, 60 * 60 * 12, "url");

            await expect(questionManager.connect(signer1).predict(0, 0))
                .to.be.revertedWithCustomError(questionManager, "AccessManagedUnauthorized");
        });

        it("Should allow a QUESTION_MANAGER to add a new answer", async () => {
            const { questionManager, manager } = await loadFixture(deployQuestionManagerFixture);
            const [, signer1] = await ethers.getSigners();
            
            let targetFunc = "newQuestion(string,string[],uint256,string)";
            await setFunctionRole(manager, target = questionManager, targetFunc, role = QUESTION_MANAGER);
            targetFunc = "addAnswer(uint256,string)";
            await setFunctionRole(manager, target = questionManager, targetFunc, role = QUESTION_MANAGER);
            await grantRole(manager, role = QUESTION_MANAGER, addr = signer1.address);
            
            await questionManager.connect(signer1).newQuestion("Q?", ["Yes"], 3600 * 6, "url");
        
            await expect(questionManager.connect(signer1).addAnswer(0, "No"))
              .to.emit(questionManager, "NewAnswerAdded");
        
            const answers = await questionManager.getQuestionAnswers(0);
            expect(answers).to.include("No");
        });

        it("should set reward if caller is FUNDS_MANAGER", async () => {
            const { questionManager, manager } = await loadFixture(deployQuestionManagerFixture);
            const [, signer1] = await ethers.getSigners();
            
            let targetFunc = "newQuestion(string,string[],uint256,string)";
            await setFunctionRole(manager, target = questionManager, targetFunc, role = QUESTION_MANAGER);
            targetFunc = "setReward(uint256,uint256)";
            await setFunctionRole(manager, target = questionManager, targetFunc, role = FUNDS_MANAGER);
            await grantRole(manager, role = FUNDS_MANAGER, addr = signer1.address);

            await questionManager.connect(signer1).newQuestion("Q?", ["Yes"], 3600 * 6, "url");
        
            await questionManager.connect(signer1).setReward(0, 1000);
            const ques = await questionManager.questions(0);
            expect(ques.reward).to.equal(1000);
        });

        /*
        it("should allow updating and validating the correct answer", async () => {
            const { questionManager, manager } = await loadFixture(deployQuestionManagerFixture);

            await questionManager.connect(manager).newQuestion("Q?", ["A", "B"], 1, "url");

            // Wait until deadline is passed
            await ethers.provider.send("evm_increaseTime", [2]);
            await ethers.provider.send("evm_mine");

            await expect(
            questionManager.connect(manager).updateValidAnswerToPending(0, 1, "B")
            ).to.emit(questionManager, "PendingValidAnswer");

            await expect(
            questionManager.connect(manager).validatePendingAnswer(0)
            ).to.emit(questionManager, "PendingAnswerValidated");

            const valid = await questionManager.getQuestionValidAnswer(0);
            expect(valid.status).to.equal(2); // VALIDATED
        });
        });
        */
    });
});