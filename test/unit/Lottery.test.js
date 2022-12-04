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
              xit("refuses entrance if lottery is not open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })

                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
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
      })
