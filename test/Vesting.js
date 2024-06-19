const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vesting Contract", function () {
    const runEveryTime = async () => {
        const [admin, user, otherAddress] = await ethers.getSigners();
        const VestingTokens = await ethers.getContractFactory("VestToken");
        const vestingTokens = await VestingTokens.deploy();

        const VestingContract = await ethers.getContractFactory("Vesting");
        const vestingContract = await VestingContract.deploy(vestingTokens.target)

        const tokensToAllocate = 1000
        await vestingTokens.mint(admin.address, tokensToAllocate)
        await vestingTokens.approve(vestingContract.target, tokensToAllocate);
        await vestingContract.allocateTokens(tokensToAllocate);

        return { admin, user, otherAddress, vestingTokens, vestingContract, VestingContract, tokensToAllocate };
    }

    describe("development", function () {
        it("Should set the right owner", async function () {
            const { vestingContract, admin } = await loadFixture(runEveryTime)
            expect(await vestingContract.owner()).to.equal(admin.address);
        });


        it("Should fail if the token address is zero", async function () {
            const { VestingContract } = await loadFixture(runEveryTime)
            await expect(
                VestingContract.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("Token address can't be 0 address.");
        });

    })

    describe("allocateTokens", function () {
        it("Should allocate tokens correctly", async function () {
            const { vestingContract, tokensToAllocate } = await loadFixture(runEveryTime)
            expect(await vestingContract.userAllocated()).to.equal((tokensToAllocate * 50) / 100);
            expect(await vestingContract.partnerAllocated()).to.equal((tokensToAllocate * 25) / 100);
            expect(await vestingContract.teamAllocated()).to.equal((tokensToAllocate * 25) / 100);
        });

        it("Should fail if token amount is zero", async function () {
            const { vestingContract } = await loadFixture(runEveryTime)
            await expect(
                vestingContract.allocateTokens(0)
            ).to.be.revertedWith("Tokens > 0");
        });

        it("Should fail if allowance is not given", async function () {
            const { VestingContract, vestingTokens } = await loadFixture(runEveryTime)
            const vestingContract = await VestingContract.deploy(vestingTokens.target)
            const tokensToAllocate = 1000;

            await expect(
                vestingContract.allocateTokens(tokensToAllocate)
            ).to.be.revertedWith("Please give allowance");
        });
    })

    describe("addBeneficiary", function () {
        it("Should add a user beneficiary successfully", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await expect(
                vestingContract.addBeneficiary(user.address, 0, 100)
            ).to.emit(vestingContract, 'BeneficiaryAdded').withArgs(user.address, 0);
        });
        it("Should add a partner beneficiary successfully", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await expect(
                vestingContract.addBeneficiary(user.address, 1, 100)
            ).to.emit(vestingContract, 'BeneficiaryAdded').withArgs(user.address, 1);
        });
        it("Should add a team beneficiary successfully", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await expect(
                vestingContract.addBeneficiary(user.address, 2, 100)
            ).to.emit(vestingContract, 'BeneficiaryAdded').withArgs(user.address, 2);
        });
        it("Should fail if vesting is already active", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await vestingContract.startVesting();

            await expect(
                vestingContract.addBeneficiary(user.address, 0, 100)
            ).to.be.revertedWith("Vesting already active.");
        });

        it("Should fail if beneficiary address is zero", async function () {
            const { vestingContract } = await loadFixture(runEveryTime)
            await expect(
                vestingContract.addBeneficiary(ethers.ZeroAddress, 0, 100)
            ).to.be.revertedWith("Beneficiary address can't be 0 address.");
        });

        it("Should fail if tokens are not allocated", async function () {
            const { vestingTokens, user } = await loadFixture(runEveryTime)
            const VestingContract = await ethers.getContractFactory("Vesting");
            const vestingContract = await VestingContract.deploy(vestingTokens.target)
            await expect(
                vestingContract.addBeneficiary(user.address, 0, 100)
            ).to.be.revertedWith("Firslty allocate the Tokens");
        });

        it("Should fail if the address is already added", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);

            await expect(
                vestingContract.addBeneficiary(user.address, 0, 100)
            ).to.be.revertedWith("Address already exist");
        });

    })
    describe("startVesting", function () {
        it("Should start vesting successfully", async function () {
            const { vestingContract } = await loadFixture(runEveryTime)
            await expect(vestingContract.startVesting())
                .to.emit(vestingContract, "VestingStarted")
                .withArgs((await ethers.provider.getBlock('latest')).timestamp);

            expect(await vestingContract.vestingActive()).to.be.true;
            expect(await vestingContract.vestingStartTime()).to.be.above(0);
        });

        it("Should fail if vesting is already active", async function () {
            const { vestingContract } = await loadFixture(runEveryTime)
            await vestingContract.startVesting();

            await expect(vestingContract.startVesting()).to.be.revertedWith("Vesting already started.");
        });

        it("should not allow non-owner to start vesting", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await expect(vestingContract.connect(user).startVesting())
                .to.be.revertedWith("Only owner can call this function");
        });
    });

    describe("checkReleasedTokens", function () {
        it("should revert if the vesting has not started", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await expect(vestingContract.connect(user).checkReleasedTokens(0)) // Role.User is 0
                .to.be.revertedWith("Owner does not start the vesting.");
        });
        it("should revert if the caller is not a beneficiary", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await vestingContract.startVesting();
            await expect(vestingContract.connect(user).checkReleasedTokens(0)) // Role.User is 0
                .to.be.revertedWith("Beneficiary not exists.");
        });
        it("Should return correct tokens for user after cliff period", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);

            await vestingContract.startVesting();
            await ethers.provider.send("evm_increaseTime", [301 * 24 * 60 * 60]);

            await ethers.provider.send("evm_mine");
            const releasedTokens = await vestingContract.connect(user).checkReleasedTokens(0);
            expect(releasedTokens).to.above(0);
        });
        it("Should return correct tokens for partner after cliff period", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)

            await vestingContract.addBeneficiary(user.address, 1, 100);
            await vestingContract.startVesting();
            await ethers.provider.send("evm_increaseTime", [61 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            const releasedTokens = await vestingContract.connect(user).checkReleasedTokens(1);
            expect(releasedTokens).to.be.above(0);
        });

        it("Should return correct tokens for team after cliff period", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)

            await vestingContract.addBeneficiary(user.address, 2, 100);
            await vestingContract.startVesting();
            await ethers.provider.send("evm_increaseTime", [61 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            const releasedTokens = await vestingContract.connect(user).checkReleasedTokens(2);
            expect(releasedTokens).to.be.above(0);
        });

        it("Should fail if the cliff period is not reached for user", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);
            await vestingContract.startVesting();
            await ethers.provider.send("evm_increaseTime", [299 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            await expect(
                vestingContract.connect(user).checkReleasedTokens(0)
            ).to.be.revertedWith("No tokens available yet.");
        });

        it("Should fail if beneficiary does not exist", async function () {
            const { vestingContract, admin, user } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);
            await vestingContract.startVesting();
            await expect(
                vestingContract.connect(admin).checkReleasedTokens(0)
            ).to.be.revertedWith("Beneficiary not exists.");
        });
    })
    describe("claimtokens", function () {
        it("should revert if the vesting has not started", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await expect(vestingContract.connect(user).claimtokens(0))
                .to.be.revertedWith("Owner does not start the vesting.");
        });

        it("should revert if there are no tokens available for withdrawal", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);
            await vestingContract.startVesting();
            await ethers.provider.send("evm_increaseTime", [100 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            await expect(vestingContract.connect(user).claimtokens(0))
                .to.be.revertedWith("No tokens available yet.");
        });

        it("should revert if the caller is not a beneficiary", async function () {
            const { vestingContract, user, admin } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);
            await vestingContract.startVesting();

            await ethers.provider.send("evm_increaseTime", [300 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            await expect(vestingContract.connect(admin).claimtokens(0))
                .to.be.revertedWith("Beneficiary not exists.");
        });

        it("should successfully transfer the tokens to the beneficiary", async function () {
            const { vestingContract, user, admin, vestingTokens } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);
            await vestingContract.startVesting();

            await ethers.provider.send("evm_increaseTime", [300 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            await expect(vestingContract.connect(user).claimtokens(0))
                .to.emit(vestingTokens, "Transfer")
                .withArgs(admin.address, user.address, 100);
        })
        it("should update the beneficiary's vesting schedule correctly", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);
            await vestingContract.startVesting();
            await ethers.provider.send("evm_increaseTime", [300 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            await vestingContract.connect(user).claimtokens(0);

            const vestingSchedule = await vestingContract.vestingSchedules(user.address, 0);
            expect(vestingSchedule.noOfTokensWithdraw).to.equal(0);
        });

        it("should delete the vesting schedule once all tokens have been withdrawn", async function () {
            const { vestingContract, user } = await loadFixture(runEveryTime)
            await vestingContract.addBeneficiary(user.address, 0, 100);
            await vestingContract.startVesting();
            const currentBlock = await ethers.provider.getBlock("latest");
            const currentTimestamp = currentBlock.timestamp;

            await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + 300 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            await vestingContract.connect(user).claimtokens(0);

            const vestingSchedule = await vestingContract.vestingSchedules(user.address, 0);
            expect(vestingSchedule.beneficiary).to.equal(ethers.ZeroAddress);
        });
    })

    runEveryTime()


})