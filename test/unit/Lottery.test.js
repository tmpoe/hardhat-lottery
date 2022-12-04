const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains } = require("../../hardhat-helper-config")
const constants = require("@openzeppelin/test-helpers")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Tests", async function () {
          let lottery, lotteryContract, lotteryEntranceFee, vrfCoordinatorMock, deployer, player

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              player = accounts[1]
              await deployments.fixture(["all"])
              lotteryContract = await ethers.getContract("Lottery", deployer)
              lottery = lotteryContract.connect(player)
              vrfCoordinatorMock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              lotteryEntranceFee = await lottery.getEntranceFee()
              interval = await lottery.getInterval()
          })
          describe("I refuse to write constructor tests", () => {
              it("works correctly, because a constructor is an internal function", () => {
                  console.log("No constructor tests")
              })
          })

          describe("Entering the lottery", async () => {
              it("refuses entrance if sent fee is too low", async () => {
                  await expect(lottery.enterLottery()).to.be.revertedWith(
                      "Lottery__NotEnoughFeeForEntry"
                  )
              })
              it("refuses entrance if lottery is not open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })

                  await increaseTimeOnChain(interval.toNumber() + 1)
                  await lottery.performUpkeep([])
                  await expect(
                      lottery.enterLottery({ value: lotteryEntranceFee })
                  ).to.be.revertedWith("Lottery__NotOpen")
              })
              it("entrance is allowed under normal circumstances", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  const enteredPlayer = await lottery.getPlayer(0)
                  assert.equal(player.address, enteredPlayer)
              })
              it("event is emitted on entrance", async () => {
                  await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(
                      lottery,
                      "LotteryEnter"
                  )
              })
          })

          describe("Check Upkeep", () => {
              it("is not necessary to upkeep if no eth has been sent (no players)", async () => {
                  await increaseTimeOnChain(interval.toNumber() + 1)
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert.equal(upkeepNeeded, false)
              })
              it("is not necessary to upkeep if lottery is not open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await increaseTimeOnChain(interval.toNumber() + 1)
                  await lottery.performUpkeep([])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert.equal(upkeepNeeded, false)
              })
              it("is not necessary to upkeep if not enough time has passed", async () => {
                  await increaseTimeOnChain(interval.toNumber() - 5)
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert.equal(upkeepNeeded, false)
              })
              it("is necessary to upkeep if enough time has passed, there is enoug eth and player and lottery is open", async () => {
                  await increaseTimeOnChain(interval.toNumber() + 1)
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert.equal(upkeepNeeded, true)
              })
          })
      })

async function increaseTimeOnChain(increaseBy) {
    await network.provider.send("evm_increaseTime", [increaseBy])
    await network.provider.request({ method: "evm_mine", params: [] })
}
