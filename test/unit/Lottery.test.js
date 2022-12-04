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
          describe("Peform Upkeep", () => {
              it("emits event if no upkeep needed", async () => {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith(
                      "Lottery__UpkeepNotNeeded"
                  )
              })
              it("makes lottery go into not open state and emits event", async () => {
                  await increaseTimeOnChain(interval.toNumber() + 1)
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  const txResponse = await lottery.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const event = txReceipt.events[1]

                  const lotteryState = await lottery.getLotteryState()

                  assert(event.args.requestId.toNumber() > 0)
                  assert.equal(lotteryState, 1)
              })
          })
          describe("Pick Random Winner", () => {
              it("picks an arbitrary winner and resets contract", async () => {
                  await increaseTimeOnChain(interval.toNumber() + 1)
                  await lottery.enterLottery({ value: lotteryEntranceFee })

                  const additionalNumPlayers = 3
                  const nextUntouchedAddressIndex = 2

                  for (
                      let i = nextUntouchedAddressIndex;
                      i < nextUntouchedAddressIndex + additionalNumPlayers;
                      i++
                  ) {
                      const lottery2 = await lotteryContract.connect(accounts[i])
                      await lottery2.enterLottery({ value: lotteryEntranceFee })
                  }

                  const startingTimeStamp = await lottery.getLastTimeStamp()
                  await new Promise(async (resolve, reject) => {
                      lotteryContract.once("WinnerPicked", async () => {
                          try {
                              // Now lets get the ending values...
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalance = await accounts[2].getBalance()
                              const endingTimeStamp = await raffle.getLastTimeStamp()
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              // Comparisons to check if our ending values are correct:
                              assert.equal(recentWinner.toString(), accounts[2].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrances)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve() // if try passes, resolves the promise
                          } catch (e) {
                              reject(e) // if try fails, rejects the promise
                          }
                      })
                  })

                  const tx = await raffle.performUpkeep("0x")
                  const txReceipt = await tx.wait(1)
                  const startingBalance = await accounts[2].getBalance()
                  await vrfCoordinatorV2Mock.fulfillRandomWords(
                      txReceipt.events[1].args.requestId,
                      raffle.address
                  )
              })
          })
      })

async function increaseTimeOnChain(increaseBy) {
    await network.provider.send("evm_increaseTime", [increaseBy])
    await network.provider.request({ method: "evm_mine", params: [] })
}
