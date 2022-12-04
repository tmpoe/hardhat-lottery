const { run } = require("hardhat")
const modules = require("web3")

async function verify(contractAddress, constructorArgs) {
    console.log("Verifying contract...")
    try {
        run("verify:verify", {
            address: contractAddress,
            constructorArguments: constructorArgs,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Contract already verified")
        } else {
            console.log(e)
        }
    }
}

module.exports = { verify }
