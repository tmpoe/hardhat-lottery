const { networkConfig, developmentChains } = require("../hardhat-helper-config.js")
const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")

const SUBSCRIPTION_FUND = ethers.utils.parseEther("2")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorAddress, subscriptionId
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorMock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorAddress = vrfCoordinatorMock.address
        const transactionRespone = await vrfCoordinatorMock.createSubscription()
        const transactionReceipt = await transactionRespone.wait(1)
        subscriptionId = transactionReceipt.events[0].args.subId
        await vrfCoordinatorMock.fundSubscription(subscriptionId, SUBSCRIPTION_FUND)
    } else {
        vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinatorAddress
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    const args = [
        vrfCoordinatorAddress,
        networkConfig[chainId]["lotteryEntranceFee"],
        networkConfig[chainId]["gasLane"],
        subscriptionId,
        networkConfig[chainId]["callbackGasLimit"],
        networkConfig[chainId]["keepersUpdateInterval"],
    ]

    const Lottery = await deploy("Lottery", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log(verify(lottery.address, args))
    }

    log("Deployment done for Lottery!")
    log("----------------------------------------------")
}

module.exports.tags = ["all", "lottery"]
