const { networkConfig, developmentChains } = require("../helper-hardhat.config")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorAddress
    if (developmentChains.includes(network.name)) {
        console.log("Deploying to local network...")
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

    const Lottery = await deployer("Lottery", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log("verify(lottery.address, args)")
    }

    log("Deployment done for Lottery!")
    log("----------------------------------------------")
}

module.exports.tags = ["all", "lottery"]
